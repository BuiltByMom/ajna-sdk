import { BigNumber, Signer, constants } from 'ethers';
import { getExpiry } from '../utils/time';
import { MAX_FENWICK_INDEX } from '../constants';
import {
  addCollateral,
  removeCollateral,
  approve,
  drawDebt,
  getErc20PoolContractMulti,
  repayDebt,
  getErc20PoolContract,
  bucketTake,
  take,
  settle,
} from '../contracts/erc20-pool';
import { Address, CallData, Loan, SignerOrProvider } from '../types';
import { indexToPrice, priceToIndex } from '../utils/pricing';
import { Bucket } from './Bucket';
import { Pool } from './Pool';
import { toWad, wdiv } from '../utils/numeric';

export interface LoanEstimate extends Loan {
  /** hypothetical lowest utilized price (LUP) assuming additional debt was drawn */
  lup: BigNumber;
  /** index of this hypothetical LUP */
  lupIndex: number;
}

/**
 * Models a pool with ERC-20 collateral
 */
class FungiblePool extends Pool {
  constructor(
    provider: SignerOrProvider,
    poolAddress: string,
    collateralAddress: string,
    quoteAddress: string
  ) {
    super(
      provider,
      poolAddress,
      collateralAddress,
      quoteAddress,
      getErc20PoolContract(poolAddress, provider),
      getErc20PoolContractMulti(poolAddress)
    );
    this.initialize();
  }

  /**
   * approve this pool to manage collateral token
   * @param signer pool user
   * @param allowance approval amount (or MaxUint256)
   * @returns transaction
   */
  async collateralApprove(signer: Signer, allowance: BigNumber) {
    return await approve(signer, this.poolAddress, this.collateralAddress, allowance);
  }

  /**
   * pledges collateral and draws debt
   * @param signer borrower
   * @param amountToBorrow new debt to draw
   * @param collateralToPledge new collateral to deposit
   * @param limitIndex revert if loan would drop LUP below this bucket (or pass MAX_FENWICK_INDEX)
   * @returns transaction
   */
  async drawDebt(
    signer: Signer,
    amountToBorrow: BigNumber,
    collateralToPledge: BigNumber,
    limitIndex?: number
  ) {
    const contractPoolWithSigner = this.contract.connect(signer);
    const borrowerAddress = await signer.getAddress();

    return await drawDebt(
      contractPoolWithSigner,
      borrowerAddress,
      amountToBorrow,
      limitIndex ?? MAX_FENWICK_INDEX,
      collateralToPledge
    );
  }

  /**
   * repays debt and pulls collateral
   * @param signer borrower
   * @param maxQuoteTokenAmountToRepay amount for partial repayment, MaxUint256 for full repayment, 0 for no repayment
   * @param collateralAmountToPull amount of collateral to withdraw after repayment
   * @param limitIndex revert if LUP has moved below this bucket by the time the transaction is processed
   * @returns transaction
   */
  async repayDebt(
    signer: Signer,
    maxQuoteTokenAmountToRepay: BigNumber,
    collateralAmountToPull: BigNumber,
    limitIndex?: number
  ) {
    const contractPoolWithSigner = this.contract.connect(signer);

    const sender = await signer.getAddress();
    return await repayDebt(
      contractPoolWithSigner,
      sender,
      maxQuoteTokenAmountToRepay,
      collateralAmountToPull,
      sender,
      limitIndex ?? MAX_FENWICK_INDEX
    );
  }

  /**
   * deposit collateral token into a bucket (not for borrowers)
   * @param signer address to be awarded LP
   * @param collateralAmountToAdd deposit amount
   * @param bucketIndex identifies the price bucket
   * @param ttlSeconds revert if not processed in this amount of time
   * @returns transaction
   */
  async addCollateral(
    signer: Signer,
    bucketIndex: number,
    collateralAmountToAdd: BigNumber,
    ttlSeconds?: number
  ) {
    const contractPoolWithSigner = this.contract.connect(signer);

    return await addCollateral(
      contractPoolWithSigner,
      collateralAmountToAdd,
      bucketIndex,
      await getExpiry(this.provider, ttlSeconds)
    );
  }

  /**
   * withdraw collateral from a bucket (not for borrowers)
   * @param signer address to redeem LP
   * @param bucketIndex identifies the price bucket
   * @param maxAmount optionally limits amount to remove
   * @returns transaction
   */
  async removeCollateral(
    signer: Signer,
    bucketIndex: number,
    maxAmount: BigNumber = constants.MaxUint256
  ) {
    const contractPoolWithSigner = this.contract.connect(signer);

    return await removeCollateral(contractPoolWithSigner, bucketIndex, maxAmount);
  }

  /**
   * retrieve information for a specific loan
   * @param borrowerAddress identifies the loan
   * @returns {@link Loan}
   */
  async getLoan(borrowerAddress: Address) {
    const poolPricesInfoCall = this.contractUtilsMulti.poolPricesInfo(this.poolAddress);
    const borrowerInfoCall = this.contractUtilsMulti.borrowerInfo(
      this.poolAddress,
      borrowerAddress
    );

    const response: BigNumber[][] = await this.ethcallProvider.all([
      poolPricesInfoCall,
      borrowerInfoCall,
    ]);

    const [, , , , lup] = response[0];
    const [debt, collateral] = response[1];
    const collateralization = debt.gt(0) ? collateral.mul(lup).div(debt) : toWad(1);
    const tp = collateral.gt(0) ? wdiv(debt, collateral) : BigNumber.from(0);

    return {
      collateralization,
      debt,
      collateral,
      thresholdPrice: tp,
    };
  }

  /**
   * @param bucketIndex fenwick index of the desired bucket
   * @returns {@link Bucket} modeling bucket at specified index
   */
  async getBucketByIndex(bucketIndex: number) {
    const bucket = new Bucket(this.provider, this.poolAddress, bucketIndex);
    await bucket.initialize();
    return bucket;
  }

  /**
   * @param price price within range supported by Ajna
   * @returns {@link Bucket} modeling bucket at nearest to specified price
   */
  async getBucketByPrice(price: BigNumber) {
    const bucketIndex = priceToIndex(price);
    // priceToIndex should throw upon invalid price
    const bucket = new Bucket(this.provider, this.poolAddress, bucketIndex);
    await bucket.initialize();
    return bucket;
  }

  /**
   * estimates how drawing more debt and/or pledging more collateral would impact loan
   * @param borrowerAddress identifies the loan
   * @param debtAmount additional amount of debt to draw (or 0)
   * @param collateralAmount additional amount of collateral to pledge (or 0)
   * @returns {@link LoanEstimate}
   */
  async estimateLoan(
    borrowerAddress: Address,
    debtAmount: BigNumber,
    collateralAmount: BigNumber
  ): Promise<LoanEstimate> {
    const borrowerInfo = await this.contractUtils.borrowerInfo(this.poolAddress, borrowerAddress);
    const debtInfo = await this.debtInfo();
    const lupIndex = await this.depositIndex(debtInfo.pendingDebt.add(debtAmount));

    const newBorrowerDebt = borrowerInfo.debt_.add(debtAmount);
    const newCollateralPledged = borrowerInfo.collateral_.add(collateralAmount);
    const thresholdPrice = newBorrowerDebt.div(newCollateralPledged);

    return {
      collateralization: toWad(444),
      debt: newBorrowerDebt,
      collateral: newCollateralPledged,
      thresholdPrice,
      lup: indexToPrice(lupIndex),
      lupIndex: lupIndex.toNumber(),
    };
  }

  // TODO: implement estimateRepay, to see how repaying debt or pulling collateral would impact loan

  /**
   * performs arb take operation during debt liquidation auction
   * @param signer taker
   * @param borrowerAddress identifies the loan to liquidate
   * @param bucketIndex identifies the price bucket
   * @returns transaction
   */
  async arbTake(signer: Signer, borrowerAddress: Address, bucketIndex: number) {
    const contractPoolWithSigner = this.contract.connect(signer);

    return await bucketTake(contractPoolWithSigner, borrowerAddress, false, bucketIndex);
  }

  /**
   * performs deposit take operation during debt liquidation auction
   * @param signer taker
   * @param borrowerAddress identifies the loan to liquidate
   * @param bucketIndex identifies the price bucket
   * @returns transaction
   */
  async depositTake(signer: Signer, borrowerAddress: Address, bucketIndex: number) {
    const contractPoolWithSigner = this.contract.connect(signer);

    return await bucketTake(contractPoolWithSigner, borrowerAddress, true, bucketIndex);
  }

  /**
   * called by actors to purchase collateral from the auction in exchange for quote token
   * @param signer taker
   * @param borrower identifies the loan being liquidated
   * @param maxAmount max amount of collateral that will be taken from the auction
   * @returns transaction
   */
  async take(
    signer: Signer,
    borrowerAddress: Address,
    maxAmount: BigNumber = constants.MaxUint256
  ) {
    const contractPoolWithSigner = this.contract.connect(signer);

    return await take(
      contractPoolWithSigner,
      borrowerAddress,
      maxAmount,
      await signer.getAddress()
    );
  }

  /**
   * called by actors to purchase collateral from the auction in exchange for quote token with otption to invoke callback function
   * @param signer taker
   * @param borrower identifies the loan being liquidated
   * @param maxAmount max amount of collateral that will be taken from the auction
   * @param callee identifies where collateral should be sent and where quote token should be obtained
   * @param callData if provided, take will assume the callee implements IERC*Taker. Take will send collateral to
   *                 callee before passing this data to IERC*Taker.atomicSwapCallback. If not provided,
   *                 the callback function will not be invoked.
   * @returns transaction
   */
  // TODO: needs to be tested properly
  async takeWithCall(
    signer: Signer,
    borrowerAddress: Address,
    maxAmount: BigNumber,
    callee: Address,
    callData?: CallData
  ) {
    const contractPoolWithSigner = this.contract.connect(signer);

    return await take(contractPoolWithSigner, borrowerAddress, maxAmount, callee, callData);
  }

  /**
   *  alled by actors to settle an amount of debt in a completed liquidation.
   *  @param  borrowerAddress address of the auctioned borrower
   *  @param  maxDepth  measured from HPB, maximum number of buckets deep to settle debt,
   *                    used to prevent unbounded iteration clearing large liquidations
   */
  async settle(
    signer: Signer,
    borrowerAddress: Address,
    maxDepth: BigNumber = constants.MaxUint256
  ) {
    const contractPoolWithSigner = this.contract.connect(signer);

    return await settle(contractPoolWithSigner, borrowerAddress, maxDepth);
  }
}

export { FungiblePool };
