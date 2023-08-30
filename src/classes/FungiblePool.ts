import { BigNumber, Signer, constants } from 'ethers';
import { getExpiry } from '../utils/time';
import { MAX_FENWICK_INDEX } from '../constants';
import { getErc20Contract } from '../contracts/erc20';
import {
  addCollateral,
  removeCollateral,
  approve,
  drawDebt,
  getErc20PoolContractMulti,
  repayDebt,
  getErc20PoolContract,
  collateralScale,
} from '../contracts/erc20-pool';
import { debtInfo, depositIndex, lenderInfo } from '../contracts/pool';
import { Address, CallData, Loan, SdkError, SignerOrProvider } from '../types';
import { Pool } from './Pool';
import { toWad, wdiv, wmul } from '../utils/numeric';
import { indexToPrice, priceToIndex } from '../utils/pricing';
import { borrowerInfo, getPoolInfoUtilsContract } from '../contracts/pool-info-utils';
import { FungibleBucket } from './FungibleBucket';

export interface LoanEstimate extends Loan {
  /** hypothetical lowest utilized price (LUP) assuming additional debt was drawn */
  lup: BigNumber;
  /** index of this hypothetical LUP */
  lupIndex: number;
}

/**
 * models a pool with ERC-20 collateral
 */
export class FungiblePool extends Pool {
  constructor(provider: SignerOrProvider, poolAddress: Address, ajnaAddress: Address) {
    super(
      provider,
      poolAddress,
      ajnaAddress,
      getErc20PoolContract(poolAddress, provider),
      getErc20PoolContractMulti(poolAddress)
    );
  }

  async initialize() {
    await super.initialize();
    const collateralToken = getErc20Contract(this.collateralAddress, this.provider);
    this.collateralSymbol = (await collateralToken.symbol()).replace(/"+/g, '');
    this.name = this.collateralSymbol + '-' + this.quoteSymbol;
  }

  toString() {
    return this.name + ' pool';
  }

  /**
   * approve this pool to manage collateral token
   * @param signer pool user
   * @param allowance normalized approval amount (or MaxUint256)
   * @returns promise to transaction
   */
  async collateralApprove(signer: Signer, allowance: BigNumber) {
    const denormalizedAllowance = allowance.eq(constants.MaxUint256)
      ? allowance
      : allowance.div(await collateralScale(this.contract));
    return approve(signer, this.poolAddress, this.collateralAddress, denormalizedAllowance);
  }

  /**
   * pledges collateral and draws debt
   * @param signer borrower
   * @param amountToBorrow new debt to draw
   * @param collateralToPledge new collateral to deposit
   * @param limitIndex revert if loan would drop LUP below this bucket (or pass MAX_FENWICK_INDEX)
   * @returns promise to transaction
   */
  async drawDebt(
    signer: Signer,
    amountToBorrow: BigNumber,
    collateralToPledge: BigNumber,
    limitIndex?: number
  ) {
    const contractPoolWithSigner = this.contract.connect(signer);
    const borrowerAddress = await signer.getAddress();

    return drawDebt(
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
   * @returns promise to transaction
   */
  async repayDebt(
    signer: Signer,
    maxQuoteTokenAmountToRepay: BigNumber,
    collateralAmountToPull: BigNumber,
    limitIndex?: number
  ) {
    const contractPoolWithSigner = this.contract.connect(signer);

    const sender = await signer.getAddress();
    return repayDebt(
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
   * @returns promise to transaction
   */
  async addCollateral(
    signer: Signer,
    bucketIndex: number,
    collateralAmountToAdd: BigNumber,
    ttlSeconds?: number
  ) {
    const contractPoolWithSigner = this.contract.connect(signer);

    return addCollateral(
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
   * @returns promise to transaction
   */
  async removeCollateral(
    signer: Signer,
    bucketIndex: number,
    maxAmount: BigNumber = constants.MaxUint256
  ) {
    const contractPoolWithSigner = this.contract.connect(signer);

    return removeCollateral(contractPoolWithSigner, bucketIndex, maxAmount);
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
    // obtain the borrower debt, and origination fee
    const borrowerInfoCall = this.contractUtilsMulti.borrowerInfo(
      this.poolAddress,
      borrowerAddress
    );
    const origFeeCall = this.contractUtilsMulti.borrowFeeRate(this.poolAddress);
    let response: BigNumber[][] = await this.ethcallProvider.all([borrowerInfoCall, origFeeCall]);
    const [borrowerDebt, collateral] = response[0];
    const originationFeeRate = BigNumber.from(response[1]);

    // determine pool debt
    const [poolDebt, ,] = await debtInfo(this.contract);

    // add origination fee
    debtAmount = debtAmount.add(wmul(debtAmount, originationFeeRate));

    // determine where this would push the LUP, the current interest rate, and loan count
    const lupIndexCall = this.contractMulti.depositIndex(poolDebt.add(debtAmount));
    const rateCall = this.contractMulti.interestRateInfo();
    const loansInfoCall = this.contractMulti.loansInfo();
    const totalAuctionsInPoolCall = this.contractMulti.totalAuctionsInPool();
    response = await this.ethcallProvider.all([
      lupIndexCall,
      rateCall,
      loansInfoCall,
      totalAuctionsInPoolCall,
    ]);
    const lupIndex: number = +response[0];
    const rate = BigNumber.from(response[1][0]);
    let noOfLoans = +response[2][2];
    const noOfAuctions = +response[3];
    noOfLoans += noOfAuctions;
    const lup = indexToPrice(lupIndex);

    // calculate the new amount of debt and collateralization
    const newDebt = borrowerDebt.add(debtAmount);
    const newCollateral = collateral.add(collateralAmount);
    const zero = constants.Zero;
    const thresholdPrice = newCollateral.eq(zero) ? zero : wdiv(newDebt, newCollateral);
    const encumbered = lup.eq(zero) ? zero : wdiv(newDebt, lup);
    const collateralization = encumbered.eq(zero) ? toWad(1) : wdiv(newCollateral, encumbered);

    // calculate the hypothetical MOMP and neutral price
    const mompDebt = noOfLoans === 0 ? constants.One : poolDebt.div(noOfLoans);
    const mompIndex = await depositIndex(this.contract, mompDebt);
    const momp = indexToPrice(mompIndex);
    // neutralPrice = (1 + rate) * momp * thresholdPrice/lup
    const neutralPrice = wmul(toWad(1).add(rate), wmul(momp, wdiv(thresholdPrice, lup)));

    return {
      collateralization,
      debt: newDebt,
      collateral: newCollateral,
      thresholdPrice,
      neutralPrice,
      isKicked: collateralization.lt(constants.One),
      liquidationBond: this.calculateLiquidationBond(momp, thresholdPrice, newDebt),
      lup: indexToPrice(lupIndex),
      lupIndex: lupIndex,
    };
  }

  /**
   * estimates how repaying debt and/or pulling collateral would impact loan
   * @param borrowerAddress identifies the loan
   * @param debtAmount amount of debt to repay (or 0)
   * @param collateralAmount amount of collateral to pull (or 0)
   * @returns {@link LoanEstimate}
   */
  async estimateRepay(
    borrowerAddress: Address,
    debtAmount: BigNumber,
    collateralAmount: BigNumber
  ): Promise<LoanEstimate> {
    // obtain the borrower debt
    const utilsContract = getPoolInfoUtilsContract(this.provider);
    const [borrowerDebt, collateral] = await borrowerInfo(
      utilsContract,
      this.poolAddress,
      borrowerAddress
    );

    // determine pool debt
    const [poolDebt, ,] = await debtInfo(this.contract);

    // determine where this would push the LUP, the current interest rate, and loan count
    const lupIndexCall = this.contractMulti.depositIndex(poolDebt.sub(debtAmount));
    const rateCall = this.contractMulti.interestRateInfo();
    const loansInfoCall = this.contractMulti.loansInfo();
    const totalAuctionsInPoolCall = this.contractMulti.totalAuctionsInPool();
    const response: BigNumber[][] = await this.ethcallProvider.all([
      lupIndexCall,
      rateCall,
      loansInfoCall,
      totalAuctionsInPoolCall,
    ]);
    const lupIndex: number = +response[0];
    const rate = BigNumber.from(response[1][0]);
    let noOfLoans = +response[2][2];
    const noOfAuctions = +response[3];
    noOfLoans += noOfAuctions;
    const lup = indexToPrice(lupIndex);

    const zero = constants.Zero;

    // calculate the new amount of debt and collateralization
    const newDebt = borrowerDebt.sub(debtAmount).isNegative() ? zero : borrowerDebt.sub(debtAmount);

    const newCollateral = collateral.sub(collateralAmount).isNegative()
      ? zero
      : collateral.sub(collateralAmount);

    const thresholdPrice = newCollateral.eq(zero) ? zero : wdiv(newDebt, newCollateral);
    const encumbered = lup.eq(zero) ? zero : wdiv(newDebt, lup);
    const collateralization = encumbered.eq(zero) ? toWad(1) : wdiv(newCollateral, encumbered);

    // calculate the hypothetical MOMP and neutral price
    const mompDebt = noOfLoans === 0 ? constants.One : poolDebt.div(noOfLoans);
    const mompIndex = await depositIndex(this.contract, mompDebt);
    const momp = indexToPrice(mompIndex);
    // neutralPrice = (1 + rate) * momp * thresholdPrice/lup
    const neutralPrice = wmul(toWad(1).add(rate), wmul(momp, wdiv(thresholdPrice, lup)));

    return {
      collateralization,
      debt: newDebt,
      collateral: newCollateral,
      thresholdPrice,
      neutralPrice,
      isKicked: collateralization.lt(constants.One),
      liquidationBond: this.calculateLiquidationBond(momp, thresholdPrice, newDebt),
      lup: indexToPrice(lupIndex),
      lupIndex: lupIndex,
    };
  }

  /**
   * @param bucketIndex fenwick index of the desired bucket
   * @returns {@link FungibleBucket} modeling bucket at specified index
   */
  getBucketByIndex(bucketIndex: number) {
    const bucket = new FungibleBucket(this.provider, this, bucketIndex);
    return bucket;
  }

  /**
   * @param price price within range supported by Ajna
   * @returns {@link FungibleBucket} modeling bucket at nearest to specified price
   */
  getBucketByPrice(price: BigNumber) {
    const bucketIndex = priceToIndex(price);
    // priceToIndex should throw upon invalid price
    const bucket = new FungibleBucket(this.provider, this, bucketIndex);
    return bucket;
  }

  /**
   * @param minPrice lowest desired price
   * @param maxPrice highest desired price
   * @returns array of {@link FungibleBucket}s between specified prices
   */
  getBucketsByPriceRange(minPrice: BigNumber, maxPrice: BigNumber) {
    if (minPrice.gt(maxPrice)) throw new SdkError('maxPrice must exceed minPrice');

    const buckets = new Array<FungibleBucket>();
    for (let index = priceToIndex(maxPrice); index <= priceToIndex(minPrice); index++) {
      buckets.push(new FungibleBucket(this.provider, this, index));
    }

    return buckets;
  }

  /**
   * withdraw all available liquidity from the given buckets using multicall transaction (first quote token, then - collateral if LP is left)
   * @param signer address to redeem LP
   * @param bucketIndices array of bucket indices to withdraw liquidity from
   * @returns promise to transaction
   */
  async withdrawLiquidity(signer: Signer, bucketIndices: Array<number>) {
    const signerAddress = await signer.getAddress();
    const callData: Array<CallData> = [];

    // get buckets
    const bucketPromises = bucketIndices.map(bucketIndex => this.getBucketByIndex(bucketIndex));
    const buckets = await Promise.all(bucketPromises);

    // get bucket details
    const bucketStatusPromises = buckets.map(bucket => bucket.getStatus());
    const bucketStatuses = await Promise.all(bucketStatusPromises);

    // determine lender's LP balance
    const lpBalancePromises = bucketIndices.map(bucketIndex =>
      lenderInfo(this.contract, signerAddress, bucketIndex)
    );
    const lpBalances = await Promise.all(lpBalancePromises);

    for (let i = 0; i < bucketIndices.length; ++i) {
      const [lpBalance] = lpBalances[i];
      const bucketStatus = bucketStatuses[i];
      const bucketIndex = bucketIndices[i];

      // if there is any quote token in the bucket, redeem LP for deposit first
      if (lpBalance && bucketStatus.deposit.gt(0)) {
        callData.push({
          methodName: 'removeQuoteToken',
          args: [constants.MaxUint256, bucketIndex],
        });
      }

      const depositWithdrawnEstimate = wmul(lpBalance, bucketStatus.exchangeRate);

      // CAUTION: This estimate may cause revert because we cannot predict exchange rate for an
      // arbitrary future block where the TX will be processed.
      const withdrawCollateral =
        (bucketStatus.deposit.eq(0) || depositWithdrawnEstimate.gt(bucketStatus.deposit)) &&
        bucketStatus.collateral.gt(0);

      if (withdrawCollateral) {
        callData.push({
          methodName: 'removeCollateral',
          args: [constants.MaxUint256, bucketIndex],
        });
      }
    }

    return this.multicall(signer, callData);
  }
}
