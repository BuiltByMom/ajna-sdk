import { BigNumber, Signer, constants } from 'ethers';
import { getBlockTime, getExpiry } from '../utils/time';
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
import { debtInfo, depositIndex } from '../contracts/pool';
import { Address, AuctionStatus, Loan, SignerOrProvider } from '../types';
import { Liquidation } from './Liquidation';
import { Pool } from './Pool';
import { toWad, wdiv, wmul } from '../utils/numeric';
import { indexToPrice } from '../utils/pricing';
import { borrowerInfo, getPoolInfoUtilsContract } from '../contracts/pool-info-utils';

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
   * @returns transaction
   */
  async collateralApprove(signer: Signer, allowance: BigNumber) {
    const denormalizedAllowance = allowance.eq(constants.MaxUint256)
      ? allowance
      : allowance.div(await collateralScale(this.contract));
    return await approve(signer, this.poolAddress, this.collateralAddress, denormalizedAllowance);
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

  // TODO: move to base Pool class
  /**
   * @param borrowerAddress identifies the loan under liquidation
   * @returns {@link Liquidation} models liquidation of a specific loan
   */
  getLiquidation(borrowerAddress: Address) {
    return new Liquidation(this.provider, this.contract, borrowerAddress);
  }

  // TODO: move to base Pool class
  /**
   * retrieve statuses for multiple liquidations
   * @param borrowerAddresses identifies loans under liquidation
   * @returns map of AuctionStatuses, indexed by borrower address
   */
  async getLiquidationStatuses(
    borrowerAddresses: Array<Address>
  ): Promise<Map<Address, AuctionStatus>> {
    // assemble calldata for requests
    const calls = [];
    for (const loan of borrowerAddresses) {
      calls.push(this.contractUtilsMulti.auctionStatus(this.poolAddress, loan));
    }

    // perform the multicall
    const response: any[][] = await this.ethcallProvider.all(calls);

    // prepare return value
    const retval = new Map<Address, AuctionStatus>();
    for (let i = 0; i < response.length; ++i) {
      const [kickTimestamp, collateral, debtToCover, isCollateralized, price, neutralPrice] =
        response[i];

      retval.set(
        borrowerAddresses[i],
        Liquidation._prepareAuctionStatus(
          await getBlockTime(this.provider),
          kickTimestamp,
          collateral,
          debtToCover,
          isCollateralized,
          price,
          neutralPrice
        )
      );
    }
    return retval;
  }
}
