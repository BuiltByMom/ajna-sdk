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
} from '../contracts/erc20-pool';
import { debtInfo, depositIndex } from '../contracts/pool';
import { Address, Loan, SignerOrProvider } from '../types';
import { Liquidation } from './Liquidation';
import { Pool } from './Pool';
import { toWad, wdiv, wmul } from '../utils/numeric';
import { indexToPrice } from '../utils/pricing';

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
  constructor(
    provider: SignerOrProvider,
    poolAddress: Address,
    collateralAddress: Address,
    quoteAddress: Address,
    ajnaAddress: Address
  ) {
    super(
      provider,
      poolAddress,
      collateralAddress,
      quoteAddress,
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
   * calculates bond required to liquidate a borrower
   * @param momp most optimistic matching price of the pool
   * @param tp threshold price of the loan
   * @param borrowerDebt loan debt
   * @returns required liquidation bond, in WAD precision
   */
  calculateLiquidationBond(momp: BigNumber, tp: BigNumber, borrowerDebt: BigNumber) {
    const tpMompRatio = wdiv(tp, momp);
    const onePercent = toWad('0.01');
    const bondFactor = tp.gt(momp) || tpMompRatio.lt(onePercent) ? onePercent : tpMompRatio;
    // bond = bondFactor * debt
    return wmul(bondFactor, borrowerDebt);
  }

  /**
   * retrieve information for a specific loan
   * @param borrowerAddress identifies the loan
   * @returns {@link Loan}
   */
  async getLoan(borrowerAddress: Address) {
    const poolPricesInfoCall = this.contractUtilsMulti.poolPricesInfo(this.poolAddress);
    const poolMompCall = this.contractUtilsMulti.momp(this.poolAddress);
    const poolLoansInfoCall = this.contractUtilsMulti.poolLoansInfo(this.poolAddress);
    const borrowerInfoCall = this.contractUtilsMulti.borrowerInfo(
      this.poolAddress,
      borrowerAddress
    );

    const response: BigNumber[][] = await this.ethcallProvider.all([
      poolPricesInfoCall,
      poolMompCall,
      poolLoansInfoCall,
      borrowerInfoCall,
    ]);

    const [, , , , lup] = response[0];
    const momp = BigNumber.from(response[1]);
    const [, , , pendingInflator] = response[2];
    const [debt, collateral, t0np] = response[3];
    const collateralization = debt.gt(0) ? collateral.mul(lup).div(debt) : toWad(1);
    const tp = collateral.gt(0) ? wdiv(debt, collateral) : BigNumber.from(0);
    const np = wmul(t0np, pendingInflator);

    return {
      collateralization,
      debt,
      collateral,
      thresholdPrice: tp,
      neutralPrice: np,
      liquidationBond: this.calculateLiquidationBond(momp, tp, debt),
    };
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
    // obtain the current borrower and pool debt
    const borrowerInfo = await this.contractUtils.borrowerInfo(this.poolAddress, borrowerAddress);
    const [pendingDebt, ,] = await debtInfo(this.contract);

    // determine where this would push the LUP, the current interest rate, and loan count
    const lupIndexCall = this.contractMulti.depositIndex(pendingDebt.add(debtAmount));
    const rateCall = this.contractMulti.interestRateInfo();
    const loansInfoCall = this.contractMulti.loansInfo();
    const totalAuctionsInPoolCall = this.contractMulti.totalAuctionsInPool();
    const data: string[] = await this.ethcallProvider.all([
      lupIndexCall,
      rateCall,
      loansInfoCall,
      totalAuctionsInPoolCall,
    ]);
    const lupIndex: number = +data[0];
    const rate = BigNumber.from(data[1][0]);
    let noOfLoans = +data[2][2];
    const noOfAuctions = +data[3];
    noOfLoans += noOfAuctions;
    const lup = indexToPrice(lupIndex);

    // calculate the new amount of debt and collateralization
    const newDebt = borrowerInfo.debt_.add(debtAmount);
    const newCollateral = borrowerInfo.collateral_.add(collateralAmount);
    const thresholdPrice = wdiv(newDebt, newCollateral);
    const zero = constants.Zero;
    const encumbered = lup === zero || newDebt === zero ? zero : wdiv(newDebt, lup);
    const collateralization = encumbered === zero ? toWad(1) : wdiv(newCollateral, encumbered);

    // calculate the hypothetical MOMP and neutral price
    const mompDebt = noOfLoans === 0 ? constants.One : pendingDebt.div(noOfLoans);
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
      liquidationBond: this.calculateLiquidationBond(momp, thresholdPrice, newDebt),
      lup: indexToPrice(lupIndex),
      lupIndex: lupIndex,
    };
  }

  // TODO: implement estimateRepay, to see how repaying debt or pulling collateral would impact loan

  /**
   * @param borrowerAddress identifies the loan under liquidation
   * @returns {@link Liquidation} models liquidation of a specific loan
   */
  getLiquidation(borrowerAddress: Address) {
    return new Liquidation(this.provider, this.contract, borrowerAddress);
  }
}
