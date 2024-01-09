import { Contract as ContractMulti, Provider as ProviderMulti } from 'ethcall';
import { BigNumber, Contract, Signer, constants } from 'ethers';
import {
  COLLATERALIZATION_FACTOR,
  ERC20_NON_SUBSET_HASH,
  MAX_FENWICK_INDEX,
  MAX_INFLATED_PRICE_WAD,
} from '../constants';
import { multicall } from '../contracts/common';
import { getErc20Contract } from '../contracts/erc20';
import { approve } from '../contracts/erc20-pool';
import {
  collateralAddress,
  debtInfo,
  depositIndex,
  kick,
  kickerInfo,
  quoteTokenAddress,
  quoteTokenScale,
  withdrawBonds,
  approveLPTransferors,
  revokeLPTransferors,
  lpAllowance,
  increaseLPAllowance,
  updateInterest,
  lenderInfo,
  stampLoan,
  interestRateInfo,
} from '../contracts/pool';
import {
  borrowerInfo,
  getPoolInfoUtilsContract,
  getPoolInfoUtilsContractMulti,
  poolPricesInfo,
} from '../contracts/pool-info-utils';
import { burn, getPositionManagerContract, mint } from '../contracts/position-manager';
import {
  Address,
  AuctionStatus,
  CallData,
  Loan,
  PoolInfoUtils,
  Provider,
  SdkError,
  SignerOrProvider,
} from '../types';
import { fromWad, min, toWad, wdiv, wmul, wsqrt } from '../utils/numeric';
import { indexToPrice, priceToIndex } from '../utils/pricing';
import { ClaimableReserveAuction } from './ClaimableReserveAuction';
import { PoolUtils } from './PoolUtils';
import { Liquidation } from './Liquidation';
import { getBlockTime } from '../utils/time';
import { Bucket } from './Bucket';
import { getSubsetHash } from '../contracts/erc721-pool-factory';

export interface LoanEstimate extends Loan {
  /** hypothetical lowest utilized price (LUP) assuming additional debt was drawn */
  lup: BigNumber;
  /** index of this hypothetical LUP */
  lupIndex: number;
}

export interface DebtInfo {
  /** total unaccrued debt in pool at the current block height */
  pendingDebt: BigNumber;
  /** debt accrued by pool as of the last pool interaction */
  accruedDebt: BigNumber;
  /** debt under liquidation */
  debtInAuction: BigNumber;
}

export interface KickerInfo {
  /** liquidation bond able to be withdrawn */
  claimable: BigNumber;
  /** liquidation bond not yet able to be withdrawn */
  locked: BigNumber;
}

export interface PriceInfo {
  /** price of the highest price bucket with deposit */
  hpb: BigNumber;
  /** fenwick index of the HPB */
  hpbIndex: number;
  /** highest threshold price */
  htp: BigNumber;
  /** fenwick index of the HTP */
  htpIndex: number;
  /** lowest utilized price */
  lup: BigNumber;
  /** fenwick index of the LUP */
  lupIndex: number;
  /** lowest bucket at which withdrawals are locked due to liquidation debt */
  llb: BigNumber;
  /** fenwick index of the lowest liquidation locked bucket */
  llbIndex: number;
}

export interface Stats {
  /** amount of liquidity in the pool (including utilized liquidity) */
  poolSize: BigNumber;
  /** pending amount of debt in the pool */
  debt: BigNumber;
  /** amount of debt under liquidation */
  liquidationDebt: BigNumber;
  /** number of loans in the pool */
  loansCount: number;
  /** minimum amount of debt a borrower can draw */
  minDebtAmount: BigNumber;
  /** collateralization ratio expressed as percentage */
  collateralization: BigNumber;
  /** meaningful actual utilization of the pool (MAU) */
  actualUtilization: BigNumber;
  /** pool target utilization (TU), related to inverse of collateralization */
  targetUtilization: BigNumber;
  /** the amount of excess quote tokens */
  reserves: BigNumber;
  /** denominated in quote token, or `0` if no reserves can be auctioned */
  claimableReserves: BigNumber;
  /** amount of claimable reserves which has not yet been taken */
  claimableReservesRemaining: BigNumber;
  /** current price at which `1` quote token may be purchased, denominated in `Ajna` */
  reserveAuctionPrice: BigNumber;
  /** interest rate paid by borrowers */
  borrowRate: BigNumber;
  /** the timestamp of the last interest rate update. */
  interestRateLastUpdated: Date;
  /** can be multiplied by t0debt (obtained elsewhere) to determine current debt */
  pendingInflator: BigNumber;
}

/**
 * Abstract baseclass used for pools, regardless of collateral type.
 */
export abstract class Pool {
  provider: SignerOrProvider;
  contract: Contract;
  contractMulti: ContractMulti;
  poolInfoContractUtils: PoolInfoUtils;
  contractUtilsMulti: ContractMulti;
  poolAddress: Address;
  collateralAddress: Address;
  collateralSymbol?: string;
  quoteAddress: Address;
  quoteSymbol?: string;
  ajnaAddress: Address;
  name: string;
  utils: PoolUtils;
  ethcallProvider: ProviderMulti;

  constructor(
    provider: SignerOrProvider,
    poolAddress: string,
    ajnaAddress: string,
    contract: Contract,
    contractMulti: ContractMulti
  ) {
    this.provider = provider;
    this.poolAddress = poolAddress;
    this.poolInfoContractUtils = getPoolInfoUtilsContract(provider);
    this.contractUtilsMulti = getPoolInfoUtilsContractMulti();
    this.utils = new PoolUtils(provider as Provider);
    this.ajnaAddress = ajnaAddress;
    this.name = 'pool';
    this.ethcallProvider = {} as ProviderMulti;
    this.contract = contract;
    this.contractMulti = contractMulti;
    this.quoteAddress = constants.AddressZero;
    this.collateralAddress = constants.AddressZero;
  }

  async initialize() {
    this.ethcallProvider = new ProviderMulti();
    await this.ethcallProvider.init(this.provider as Provider);

    const [quoteAddressResponse, collateralAddressResponse] = await Promise.all([
      quoteTokenAddress(this.contract),
      collateralAddress(this.contract),
    ]);
    this.quoteAddress = quoteAddressResponse;
    this.collateralAddress = collateralAddressResponse;

    const quoteToken = getErc20Contract(this.quoteAddress, this.provider);
    this.quoteSymbol = (await quoteToken.symbol()).replace(/"+/g, '');
  }

  /**
   * Approve this pool to manage Ajna token.
   * @param signer pool user
   * @param allowance approval amount (or MaxUint256)
   * @returns promise to transaction
   */
  async ajnaApprove(signer: Signer, allowance: BigNumber) {
    return approve(signer, this.poolAddress, this.ajnaAddress, allowance);
  }

  /**
   * Approve this pool to manage quote token.
   * @param signer pool user
   * @param allowance normalized approval amount (or MaxUint256)
   * @returns promise to transaction
   */
  async quoteApprove(signer: Signer, allowance: BigNumber) {
    const denormalizedAllowance = allowance.eq(constants.MaxUint256)
      ? allowance
      : allowance.div(await quoteTokenScale(this.contract));
    return approve(signer, this.poolAddress, this.quoteAddress, denormalizedAllowance);
  }

  /**
   * Retrieves pool reference prices.
   * @returns {@link PriceInfo}
   */
  async getPrices(): Promise<PriceInfo> {
    const [hpb, hpbIndex, htp, htpIndex, lup, lupIndex] = await poolPricesInfo(
      this.poolInfoContractUtils,
      this.poolAddress
    );
    const [, , liquidationDebt] = await debtInfo(this.contract);
    const llbIndex = await depositIndex(this.contract, liquidationDebt);
    const llb = indexToPrice(llbIndex);

    return {
      hpb,
      hpbIndex: +hpbIndex,
      htp,
      htpIndex: +htpIndex,
      lup,
      lupIndex: +lupIndex,
      llb,
      llbIndex: +llbIndex,
    };
  }

  /**
   * Retrieves pool statistics.
   * @returns {@link Stats}
   */
  async getStats(): Promise<Stats> {
    // PoolInfoUtils multicall
    const poolLoansInfoCall = this.contractUtilsMulti.poolLoansInfo(this.poolAddress);
    const poolUtilizationInfoCall = this.contractUtilsMulti.poolUtilizationInfo(this.poolAddress);
    const poolReservesInfo = this.contractUtilsMulti.poolReservesInfo(this.poolAddress);
    const utilsData: Array<string> = await this.ethcallProvider.all([
      poolLoansInfoCall,
      poolUtilizationInfoCall,
      poolReservesInfo,
    ]);
    const [poolSize, loansCount, , pendingInflator] = utilsData[0];
    const [minDebtAmount, collateralization, actualUtilization, targetUtilization] = utilsData[1];
    const [reserves, claimableReserves, claimableReservesRemaining, auctionPrice] = utilsData[2];

    // Pool multicall
    const poolData: any = await this.ethcallProvider.all([
      this.contractMulti.debtInfo(),
      this.contractMulti.interestRateInfo(),
    ]);
    const [debt, , liquidationDebt] = poolData[0];
    const rateInfo = poolData[1];

    return {
      poolSize: BigNumber.from(poolSize),
      debt,
      liquidationDebt,
      loansCount: +loansCount,
      minDebtAmount: BigNumber.from(minDebtAmount),
      collateralization: BigNumber.from(collateralization),
      actualUtilization: BigNumber.from(actualUtilization),
      targetUtilization: BigNumber.from(targetUtilization),
      reserves: BigNumber.from(reserves),
      claimableReserves: BigNumber.from(claimableReserves),
      claimableReservesRemaining: BigNumber.from(claimableReservesRemaining),
      reserveAuctionPrice: BigNumber.from(auctionPrice),
      borrowRate: rateInfo[0],
      interestRateLastUpdated: new Date(+rateInfo[1] * 1000),
      pendingInflator: BigNumber.from(pendingInflator),
    };
  }

  /**
   * Measuring from highest price bucket with liquidity, determines index at which all liquidity in
   * the book has been utilized by specified debt; useful for estimating LUP.
   * @param debtAmount pool debt to be applied to liquidity
   * @returns fenwick index
   */
  async depositIndex(debtAmount: BigNumber) {
    return await depositIndex(this.contract, debtAmount);
  }

  /**
   * Enables signer to bundle transactions together atomically in a single request.
   * @param signer consumer initiating transactions
   * @param callData array of transactions to sign and submit
   * @returns promise to transaction
   */
  async multicall(signer: Signer, callData: Array<CallData>) {
    const contractPoolWithSigner = this.contract.connect(signer);

    return multicall(contractPoolWithSigner, callData);
  }

  async lpAllowance(index: BigNumber, spender: Address, owner: Address) {
    return await lpAllowance(this.contract, index, spender, owner);
  }

  async increaseLPAllowance(signer: Signer, indexes: Array<number>, amounts: Array<BigNumber>) {
    if (indexes.length !== amounts.length) {
      throw new SdkError('indexes and amounts must be same length');
    }

    const poolWithSigner = this.contract.connect(signer);
    const spender = getPositionManagerContract(signer).address;
    return increaseLPAllowance(poolWithSigner, spender, indexes, amounts);
  }

  /**
   * Checks if LP allowances are sufficient to memorialize position.
   * @param signer Consumer initiating transactions.
   * @param indices Fenwick index of the desired bucket.
   * @returns `true` if LP allowances are sufficient to memorialize position otherwise `false`.
   */
  async areLPAllowancesSufficient(signer: Signer, indices: Array<number>): Promise<boolean> {
    const spender = getPositionManagerContract(signer).address;
    const signerAddress = await signer.getAddress();

    const allowancePromises = indices.map(index =>
      this.contractMulti.lpAllowance(index, spender, signerAddress)
    );
    const allowances: Array<BigNumber> = await this.ethcallProvider.all(allowancePromises);

    const balancePromises = indices.map(index => lenderInfo(this.contract, signerAddress, index));
    const balances = await Promise.all(balancePromises);

    for (let i = 0; i < allowances.length; ++i) {
      const allowance = allowances[i];
      const balance = balances[i][0];
      if (allowance.lt(balance)) {
        return false;
      }
    }

    return true;
  }

  /**
   * @param minPrice lowest desired price
   * @param maxPrice highest desired price
   * @returns array of {@link Bucket}s between specified prices
   */
  getBucketsByPriceRange(minPrice: BigNumber, maxPrice: BigNumber) {
    if (minPrice.gt(maxPrice)) throw new SdkError('maxPrice must exceed minPrice');

    const buckets = new Array<Bucket>();
    for (let index = priceToIndex(maxPrice); index <= priceToIndex(minPrice); index++) {
      buckets.push(new Bucket(this.provider, this, index));
    }

    return buckets;
  }

  /**
    Retrieves origination fee rate for this pool; multiply by new debt to get fee.
    @returns origination fee rate, in WAD precision
   */
  async getOriginationFeeRate() {
    return await this.poolInfoContractUtils.borrowFeeRate(this.poolAddress);
  }

  /**
   * Retrieve information for a specific loan.
   * @param borrowerAddress identifies the loan
   * @returns {@link Loan}
   */
  async getLoan(borrowerAddress: Address): Promise<Loan> {
    const poolPricesInfoCall = this.contractUtilsMulti.poolPricesInfo(this.poolAddress);
    const poolLoansInfoCall = this.contractUtilsMulti.poolLoansInfo(this.poolAddress);
    const borrowerInfoCall = this.contractUtilsMulti.borrowerInfo(
      this.poolAddress,
      borrowerAddress
    );
    const auctionStatusCall = this.contractUtilsMulti.auctionStatus(
      this.poolAddress,
      borrowerAddress
    );

    const response: Array<Array<BigNumber>> = await this.ethcallProvider.all([
      poolPricesInfoCall,
      poolLoansInfoCall,
      borrowerInfoCall,
      auctionStatusCall,
    ]);

    const [, , , , lup] = response[0];
    const [, , , pendingInflator] = response[1];
    const [debt, collateral, t0np, tp] = response[2];
    const [kickTimestamp] = response[3];
    const collateralization = debt.gt(0)
      ? wdiv(wmul(collateral, lup), wmul(debt, COLLATERALIZATION_FACTOR))
      : toWad(1);
    const np = wmul(t0np, pendingInflator);

    const [rate] = await interestRateInfo(this.contract);
    const npTpRatio = this.calculateNpTpRatio(rate);

    return {
      collateralization,
      debt,
      collateral,
      thresholdPrice: tp,
      neutralPrice: np,
      liquidationBond: this.calculateLiquidationBond(npTpRatio, debt),
      isKicked: !kickTimestamp.eq(BigNumber.from(0)),
    };
  }

  /**
   * Retrieve information for a list of loans.
   * @param borrowerAddresses identifies the loans
   * @returns map of Loans, indexed by borrowerAddress
   */
  async getLoans(borrowerAddresses: Array<Address>): Promise<Map<Address, Loan>> {
    const calls = [];
    // push pool-level requests followed by request for each loan
    calls.push(this.contractUtilsMulti.poolPricesInfo(this.poolAddress));
    calls.push(this.contractUtilsMulti.poolLoansInfo(this.poolAddress));
    for (const loan of borrowerAddresses) {
      calls.push(this.contractUtilsMulti.borrowerInfo(this.poolAddress, loan));
      calls.push(this.contractUtilsMulti.auctionStatus(this.poolAddress, loan));
    }

    // perform the multicall
    const response: Array<Array<BigNumber>> = await this.ethcallProvider.all(calls);

    // since loan details depend upon pool-level data, parse pool data first
    const retval = new Map<Address, Loan>();
    let i = 0;
    const [, , , , lup] = response[i];
    const [, , , pendingInflator] = response[++i];

    // calculate npTpRatio, needed for calculating liquidation bonds
    const [rate] = await interestRateInfo(this.contract);
    const npTpRatio = this.calculateNpTpRatio(rate);

    // iterate through borrower info, offset by the 3 pool-level requests
    let borrowerIndex = 0;
    while (borrowerIndex < borrowerAddresses.length) {
      const [debt, collateral, t0np, tp] = response[++i];
      const kickTimestamp = response[++i][0];

      const collateralization = debt.gt(0)
        ? wdiv(wmul(collateral, lup), wmul(debt, COLLATERALIZATION_FACTOR))
        : toWad(1);
      const np = wmul(t0np, pendingInflator);
      retval.set(borrowerAddresses[borrowerIndex++], {
        collateralization,
        debt,
        collateral,
        thresholdPrice: tp,
        neutralPrice: np,
        liquidationBond: this.calculateLiquidationBond(npTpRatio, debt),
        isKicked: !kickTimestamp.eq(BigNumber.from(0)),
      });
    }

    return retval;
  }

  /**
   * @param borrowerAddress identifies the loan under liquidation
   * @returns {@link Liquidation} models liquidation of a specific loan
   */
  getLiquidation(borrowerAddress: Address) {
    return new Liquidation(this.provider, this.contract, borrowerAddress);
  }

  /**
   * Retrieve statuses for multiple liquidations from the PoolInfoUtils contract.
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
    const response: Array<Array<any>> = await this.ethcallProvider.all(calls);

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

  /**
   * Calculates bond required to liquidate a borrower.
   * @param npTpRatio relationship between neutral price and threshold price
   * @param borrowerDebt loan debt
   * @returns required liquidation bond, in WAD precision
   */
  calculateLiquidationBond(npTpRatio: BigNumber, borrowerDebt: BigNumber) {
    // bondFactor = min((NP-to-TP-ratio - 1)/10, 0.03)
    const bondFactor = min(wdiv(npTpRatio.sub(toWad(1)), toWad(10)), toWad(0.03));
    // bondSize = bondFactor * borrowerDebt
    return wmul(bondFactor, borrowerDebt);
  }

  /**
   * Calculate a loan's neutral price.
   * @param thresholdPrice loan debt * 1.04 / pledged collateral
   * @param npTpRatio relationship between neutral price and threshold price
   * @returns neutral price, in WAD precision
   */
  calculateNeutralPrice(thresholdPrice: BigNumber, npTpRatio: BigNumber) {
    return min(wmul(thresholdPrice, npTpRatio), MAX_INFLATED_PRICE_WAD);
  }

  /**
   * Calculate neutral price to threshold price "ratio".
   * @param rate current pool "borrower" interest rate
   * @returns relationship between the neutral price and threshold price
   */
  calculateNpTpRatio(rate: BigNumber) {
    return toWad(1).add(wdiv(wsqrt(rate), toWad(2)));
  }

  /**
   * Initiates a liquidation of a loan.
   * @param signer kicker
   * @param borrowerAddress identifies the loan to liquidate
   * @param limitIndex reverts if neutral price of loan drops below this bucket before TX processed
   * @returns promise to transaction
   */
  async kick(signer: Signer, borrowerAddress: Address, limitIndex: number = MAX_FENWICK_INDEX) {
    const contractPoolWithSigner = this.contract.connect(signer);

    return kick(contractPoolWithSigner, borrowerAddress, limitIndex);
  }

  /**
   * Checks whether threshold price of a loan is currently above the LUP;
   * does NOT estimate whether it would be profitable to liquidate the loan.
   * @param borrowerAddress identifies the loan to check
   * @returns true if loan may be liquidated, otherwise false
   */
  async isKickable(borrowerAddress: Address) {
    const poolPricesInfoCall = this.contractUtilsMulti.poolPricesInfo(this.poolAddress);
    const borrowerInfoCall = this.contractUtilsMulti.borrowerInfo(
      this.poolAddress,
      borrowerAddress
    );

    const response: Array<Array<BigNumber>> = await this.ethcallProvider.all([
      poolPricesInfoCall,
      borrowerInfoCall,
    ]);

    const [, , , , lup] = response[0];
    const [debt, collateral] = response[1];
    const tp = collateral.gt(0) ? debt.div(collateral) : BigNumber.from(0);

    return lup.lte(toWad(tp));
  }

  /**
   * Retrieves status of an auction kicker's liquidation bond.
   * @param kickerAddress identifies the actor who kicked liquidations
   */
  async kickerInfo(kickerAddress: Address): Promise<KickerInfo> {
    const [claimable, locked] = await kickerInfo(this.contract, kickerAddress);

    return {
      claimable,
      locked,
    };
  }

  /**
   * Called by kickers to withdraw liquidation bond from one or more auctions kicked.
   * @param signer kicker
   * @param maxAmount optional amount of bond to withdraw; defaults to all
   * @returns promise to transaction
   */
  async withdrawBonds(signer: Signer, maxAmount: BigNumber = constants.MaxUint256) {
    const contractPoolWithSigner = this.contract.connect(signer);
    const recipient = await signer.getAddress();
    return withdrawBonds(contractPoolWithSigner, recipient, maxAmount);
  }

  /**
   * Estimates how drawing more debt and/or pledging more collateral would impact loan.
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
    let response: Array<Array<BigNumber>> = await this.ethcallProvider.all([
      borrowerInfoCall,
      origFeeCall,
    ]);
    const [borrowerDebt, collateral] = response[0];
    const originationFeeRate = BigNumber.from(response[1]);
    debtAmount = debtAmount.add(wmul(debtAmount, originationFeeRate));

    // determine pool debt
    let [poolDebt] = await debtInfo(this.contract);

    // determine where this would push the LUP, the current interest rate, and loan count
    poolDebt = poolDebt.add(debtAmount);
    const lupIndexCall = this.contractMulti.depositIndex(poolDebt);
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
    const thresholdPrice = newCollateral.eq(zero)
      ? zero
      : wmul(wdiv(newDebt, newCollateral), COLLATERALIZATION_FACTOR);
    const encumbered = lup.eq(zero) ? zero : wmul(wdiv(newDebt, lup), COLLATERALIZATION_FACTOR);
    const collateralization = encumbered.eq(zero) ? toWad(1) : wdiv(newCollateral, encumbered);

    // calculate the hypothetical neutral price
    const npTpRatio = this.calculateNpTpRatio(rate);
    const neutralPrice = this.calculateNeutralPrice(thresholdPrice, npTpRatio);

    return {
      collateralization,
      debt: newDebt,
      collateral: newCollateral,
      thresholdPrice,
      neutralPrice,
      isKicked: collateralization.lt(constants.One),
      liquidationBond: this.calculateLiquidationBond(npTpRatio, newDebt),
      lup: indexToPrice(lupIndex),
      lupIndex: lupIndex,
    };
  }

  /**
   * Estimates how repaying debt and/or pulling collateral would impact loan.
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
    const response: Array<Array<BigNumber>> = await this.ethcallProvider.all([
      lupIndexCall,
      rateCall,
      loansInfoCall,
      totalAuctionsInPoolCall,
    ]);
    const lupIndex: number = +response[0];
    const rate = BigNumber.from(response[1][0]);
    let noOfLoans = +response[1][2];
    const noOfAuctions = +response[2];
    noOfLoans += noOfAuctions;
    const lup = indexToPrice(lupIndex);

    const zero = constants.Zero;

    // calculate the new amount of debt and collateralization
    const newDebt = borrowerDebt.sub(debtAmount).isNegative() ? zero : borrowerDebt.sub(debtAmount);

    const newCollateral = collateral.sub(collateralAmount).isNegative()
      ? zero
      : collateral.sub(collateralAmount);

    const thresholdPrice = newCollateral.eq(zero)
      ? zero
      : wdiv(wmul(newDebt, COLLATERALIZATION_FACTOR), newCollateral);
    const encumbered = lup.eq(zero) ? zero : wdiv(wmul(newDebt, COLLATERALIZATION_FACTOR), lup);
    const collateralization = encumbered.eq(zero) ? toWad(1) : wdiv(newCollateral, encumbered);

    // calculate the hypothetical neutral price
    const npTpRatio = this.calculateNpTpRatio(rate);
    const neutralPrice = this.calculateNeutralPrice(thresholdPrice, npTpRatio);

    return {
      collateralization,
      debt: newDebt,
      collateral: newCollateral,
      thresholdPrice,
      neutralPrice,
      isKicked: collateralization.lt(constants.One),
      liquidationBond: this.calculateLiquidationBond(npTpRatio, newDebt),
      lup: indexToPrice(lupIndex),
      lupIndex: lupIndex,
    };
  }

  /**
   * Determines whether interest rate will increase, decrease, or remain the same as a result of
   * updating the interest rate, without regard to the 12-hour rate update interval.
   * @param poolStats pool statistics obtained from @link{Pool.getStats}
   */
  estimateUpdateInterest(poolStats: Stats) {
    // calculating as numbers because squaring a WAD is complicated
    const mau = +fromWad(poolStats.actualUtilization);
    const mau102 = mau * 1.02;
    const tu = +fromWad(poolStats.targetUtilization);

    if (4 * (tu - mau102) < (tu + mau102 - 1) ** 2 - 1) {
      // raise rates
      return wmul(poolStats.borrowRate, toWad('1.1'));
    } else if (4 * (tu - mau) > 1 - (tu + mau - 1) ** 2) {
      // lower rates
      return wmul(poolStats.borrowRate, toWad('0.9'));
    } else {
      // rates remain unchanged
      return poolStats.borrowRate;
    }
  }

  /**
   * May be called periodically by actors to adjust interest rate if no other TXes have occurred
   * in the past 12 hours.
   * @param signer actor who wants to update the interest rate
   * @returns transaction
   */
  async updateInterest(signer: Signer) {
    const contractPoolWithSigner = this.contract.connect(signer);
    return updateInterest(contractPoolWithSigner);
  }

  /**
   * Updates the neutral price of a borrower's own loan, often useful after partial repayment.
   * @param borrower borrower who wishes to stamp their own loan
   */
  async stampLoan(signer: Signer) {
    const contractPoolWithSigner = this.contract.connect(signer);
    return stampLoan(contractPoolWithSigner);
  }

  /**
   * Returns `Claimable Reserve Auction` (`CRA`) wrapper object.
   * @returns CRA wrapper object
   */
  getClaimableReserveAuction() {
    return new ClaimableReserveAuction(
      this.provider,
      this.contract,
      this.poolInfoContractUtils,
      this.poolAddress
    );
  }

  /**
   * Create a new empty LP token for the purpose of memorializing lender position(s).
   * @param signer lender
   * @param subset optional subset of NFT ids in pool
   * @returns promise to transaction
   */
  async mintLPToken(signer: Signer, subset?: Array<number>) {
    const subsetHash = subset
      ? getSubsetHash(subset.map(val => BigNumber.from(val)))
      : ERC20_NON_SUBSET_HASH;
    return mint(signer, await signer.getAddress(), this.poolAddress, subsetHash);
  }

  /**
   * Burn an empty LP token which has already been redeemed for LP in all buckets.
   * @param signer LP token holder
   * @param tokenId identifies the empty token to burn
   * @returns promise to transaction
   */
  async burnLPToken(signer: Signer, tokenId: BigNumber) {
    return burn(signer, tokenId, this.poolAddress);
  }

  async approvePositionManagerLPTransferor(signer: Signer) {
    const addr = getPositionManagerContract(signer).address;
    return approveLPTransferors(signer, this.contract, [addr]);
  }

  async isLPTransferorApproved(signer: Signer): Promise<boolean> {
    const transferor = getPositionManagerContract(signer).address;
    const signerAddress = await signer.getAddress();
    return await this.contract.approvedTransferors(signerAddress, transferor);
  }

  async revokePositionManagerLPTransferor(signer: Signer) {
    const addr = getPositionManagerContract(signer).address;
    return revokeLPTransferors(signer, this.contract, [addr]);
  }
}
