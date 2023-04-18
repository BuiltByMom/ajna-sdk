import { BigNumber, Signer, constants } from 'ethers';
import { getExpiry } from '../utils/time';
import { MAX_FENWICK_INDEX } from '../constants';
import {
  addCollateral,
  removeCollateral,
  approve,
  drawDebt,
  getErc20PoolContract,
  repayDebt,
} from '../contracts/erc20-pool';
import { Address, SignerOrProvider } from '../types';
import { indexToPrice, priceToIndex } from '../utils/pricing';
import { Bucket } from './Bucket';
import { Pool } from './Pool';

export interface LoanEstimate {
  /** hypothetical lowest utilized price (LUP) assuming additional debt was drawn */
  lup: BigNumber;
  /** index of this hypothetical LUP */
  lupIndex: number;
  /** hypothetical threshold price for the new loan */
  thresholdPrice: BigNumber;
  /** true if loan would be sufficiently collateralized, otherwise false */
  canBorrow: boolean;
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
      getErc20PoolContract(poolAddress, provider)
    );
    this.initialize();
  }

  /**
   * approve this pool to manage collateral token
   * @param signer pool user
   * @param allowance approval amount (or MaxUint256)
   * @returns transaction
   */
  collateralApprove = async (signer: Signer, allowance: BigNumber) => {
    return await approve(signer, this.poolAddress, this.collateralAddress, allowance);
  };

  /**
   * pledges collateral and draws debt
   * @param signer borrower
   * @param amountToBorrow new debt to draw
   * @param collateralToPledge new collateral to deposit
   * @param limitIndex revert if loan would drop LUP below this bucket (or pass MAX_FENWICK_INDEX)
   * @returns transaction
   */
  drawDebt = async (
    signer: Signer,
    amountToBorrow: BigNumber,
    collateralToPledge: BigNumber,
    limitIndex?: number
  ) => {
    const contractPoolWithSigner = this.contract.connect(signer);
    const borrowerAddress = await signer.getAddress();

    const estimateLoan = await this.estimateLoan(
      borrowerAddress,
      amountToBorrow,
      collateralToPledge
    );

    if (!estimateLoan.canBorrow) {
      throw new Error('ERR_BORROWER_UNCOLLATERALIZED');
    }

    return await drawDebt(
      contractPoolWithSigner,
      borrowerAddress,
      amountToBorrow,
      limitIndex ?? MAX_FENWICK_INDEX,
      collateralToPledge
    );
  };

  /**
   * repays debt and pulls collateral
   * @param signer borrower
   * @param maxQuoteTokenAmountToRepay amount for partial repayment, MaxUint256 for full repayment, 0 for no repayment
   * @param collateralAmountToPull amount of collateral to withdraw after repayment
   * @param limitIndex revert if LUP has moved below this bucket by the time the transaction is processed
   * @returns transaction
   */
  repayDebt = async (
    signer: Signer,
    maxQuoteTokenAmountToRepay: BigNumber,
    collateralAmountToPull: BigNumber,
    limitIndex?: number
  ) => {
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
  };

  /**
   * deposit collateral token into a bucket (not for borrowers)
   * @param signer address to be awarded LP
   * @param collateralAmountToAdd deposit amount
   * @param bucketIndex identifies the price bucket
   * @param ttlSeconds revert if not processed in this amount of time
   * @returns transaction
   */
  addCollateral = async (
    signer: Signer,
    collateralAmountToAdd: BigNumber,
    bucketIndex: number,
    ttlSeconds?: number
  ) => {
    const contractPoolWithSigner = this.contract.connect(signer);

    return await addCollateral(
      contractPoolWithSigner,
      collateralAmountToAdd,
      bucketIndex,
      await getExpiry(this.provider, ttlSeconds)
    );
  };

  /**
   * withdraw collateral from a bucket (not for borrowers)
   * @param signer address to redeem LP
   * @param bucketIndex identifies the price bucket
   * @param maxAmount optionally limits amount to remove
   * @returns transaction
   */
  removeCollateral = async (
    signer: Signer,
    bucketIndex: number,
    maxAmount: BigNumber = constants.MaxUint256
  ) => {
    const contractPoolWithSigner = this.contract.connect(signer);

    return await removeCollateral(contractPoolWithSigner, bucketIndex, maxAmount);
  };

  /**
   * retrieve information for a specific loan
   * @param borrowerAddress identifies the loan
   * @returns collateralization of loan, debt, pledged collateral, and threshold price
   */
  getLoan = async (borrowerAddress: Address) => {
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
    const collateralization = debt.gt(0) ? collateral.mul(lup).div(debt) : BigNumber.from(1);
    const tp = collateral.gt(0) ? debt.div(collateral) : BigNumber.from(0);

    return {
      collateralization: collateralization,
      debt,
      collateral,
      thresholdPrice: tp,
    };
  };

  /**
   * @param bucketIndex fenwick index of the desired bucket
   * @returns {@link Bucket} modeling bucket at specified index
   */
  getBucketByIndex = async (bucketIndex: number) => {
    const bucket = new Bucket(this.provider, this.poolAddress, bucketIndex);
    await bucket.initialize();
    return bucket;
  };

  /**
   * @param price price within range supported by Ajna
   * @returns {@link Bucket} modeling bucket at nearest to specified price
   */
  getBucketByPrice = async (price: BigNumber) => {
    const bucketIndex = priceToIndex(price);
    // priceToIndex should throw upon invalid price
    const bucket = new Bucket(this.provider, this.poolAddress, bucketIndex);
    await bucket.initialize();
    return bucket;
  };

  /**
   * estimates how drawing more debt and/or pledging more collateral would impact loan
   * @param borrowerAddress identifies the loan
   * @param debtAmount additional amount of debt to draw (or 0)
   * @param collateralAmount additional amount of collateral to pledge (or 0)
   * @returns new LUP index, threshold price, flag indicating whether loan is possible
   */
  estimateLoan = async (
    borrowerAddress: Address,
    debtAmount: BigNumber,
    collateralAmount: BigNumber
  ): Promise<LoanEstimate> => {
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
    const [borrowerDebt, collateral] = response[1];

    const { pendingDebt } = await this.debtInfo();

    const lupIndex = await this.depositIndex(pendingDebt.add(debtAmount));

    const thresholdPrice = borrowerDebt.add(debtAmount).div(collateral.add(collateralAmount));

    return {
      lup: indexToPrice(lupIndex),
      lupIndex: lupIndex.toNumber(),
      thresholdPrice,
      canBorrow: thresholdPrice.lt(lup),
    };
  };

  // TODO: implement estimateRepay, to see how repaying debt or pulling collateral would impact loan
}

export { FungiblePool };
