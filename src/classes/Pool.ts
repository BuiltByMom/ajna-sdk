import { Contract as ContractMulti, Provider as ProviderMulti } from 'ethcall';
import { BigNumber, Contract, Signer, constants } from 'ethers';
import { PoolInfoUtils } from 'types/contracts';
import { MAX_FENWICK_INDEX, MAX_SETTLE_BUCKETS } from '../constants';
import { multicall } from '../contracts/common';
import { approve } from '../contracts/erc20-pool';
import {
  addQuoteToken,
  debtInfo,
  depositIndex,
  kick,
  kickReserveAuction,
  kickWithDeposit,
  lenderInfo,
  loansInfo,
  moveQuoteToken,
  removeQuoteToken,
  settle,
  takeReserves,
} from '../contracts/pool';
import {
  getPoolInfoUtilsContract,
  getPoolInfoUtilsContractMulti,
  poolPricesInfo,
} from '../contracts/pool-info-utils';
import { Address, CallData, Provider, SignerOrProvider } from '../types';
import { toWad } from '../utils/numeric';
import { getExpiry } from '../utils/time';
import { PoolUtils } from './PoolUtils';

export interface DebtInfo {
  /** total unaccrued debt in pool at the current block height */
  pendingDebt: BigNumber;
  /** debt accrued by pool as of the last pool interaction */
  accruedDebt: BigNumber;
  /** debt under liquidation */
  debtInAuction: BigNumber;
}

export interface LoansInfo {
  /** lender with the least-collateralized loan */
  maxBorrower: Address;
  /** highest threshold price (HTP) */
  maxThresholdPrice: BigNumber;
  /** number of loans in the pool */
  noOfLoans: number;
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
}

export interface Stats {
  /** amount of liquidity in the pool (including utilized liquidity) */
  poolSize: BigNumber;
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
  auctionPrice: BigNumber;
}

/**
 * Abstract baseclass used for pools, regardless of collateral type.
 */
abstract class Pool {
  provider: SignerOrProvider;
  contract: Contract;
  contractMulti: ContractMulti;
  contractUtils: PoolInfoUtils;
  contractUtilsMulti: ContractMulti;
  poolAddress: Address;
  quoteAddress: Address;
  collateralAddress: Address;
  ajnaAddress: Address;
  utils: PoolUtils;
  ethcallProvider: ProviderMulti;

  constructor(
    provider: SignerOrProvider,
    poolAddress: string,
    collateralAddress: string,
    quoteAddress: string,
    ajnaAddress: string,
    contract: Contract,
    contractMulti: ContractMulti
  ) {
    this.provider = provider;
    this.poolAddress = poolAddress;
    this.contractUtils = getPoolInfoUtilsContract(provider);
    this.contractUtilsMulti = getPoolInfoUtilsContractMulti();
    this.utils = new PoolUtils(provider as Provider);
    this.quoteAddress = quoteAddress;
    this.collateralAddress = collateralAddress;
    this.ajnaAddress = ajnaAddress;
    this.ethcallProvider = {} as ProviderMulti;
    this.contract = contract;
    this.contractMulti = contractMulti;
  }

  async initialize() {
    this.ethcallProvider = new ProviderMulti();
    await this.ethcallProvider.init(this.provider as Provider);
  }

  /**
   * approve this pool to manage Ajna token
   * @param signer pool user
   * @param allowance approval amount (or MaxUint256)
   * @returns transaction
   */
  async ajnaApprove(signer: Signer, allowance: BigNumber) {
    return await approve(signer, this.poolAddress, this.ajnaAddress, allowance);
  }

  /**
   * approve this pool to manage quote token
   * @param signer pool user
   * @param allowance approval amount (or MaxUint256)
   * @returns transaction
   */
  async quoteApprove(signer: Signer, allowance: BigNumber) {
    return await approve(signer, this.poolAddress, this.quoteAddress, allowance);
  }

  /**
   * deposits quote token into a bucket
   * @param signer lender
   * @param bucketIndex identifies the price bucket
   * @param amount amount to deposit
   * @param ttlSeconds revert if not processed in this amount of block time
   * @returns transaction
   */
  async addQuoteToken(signer: Signer, bucketIndex: number, amount: BigNumber, ttlSeconds?: number) {
    const contractPoolWithSigner = this.contract.connect(signer);

    return await addQuoteToken(
      contractPoolWithSigner,
      amount,
      bucketIndex,
      await getExpiry(this.provider, ttlSeconds)
    );
  }

  /**
   * moves quote token between buckets
   * @param signer lender
   * @param fromIndex price bucket from which quote token should be withdrawn
   * @param toIndex price bucket to which quote token should be deposited
   * @param maxAmountToMove optionally limits amount to move
   * @param ttlSeconds revert if not processed in this amount of time
   * @returns transaction
   */
  async moveQuoteToken(
    signer: Signer,
    fromIndex: number,
    toIndex: number,
    maxAmountToMove = constants.MaxUint256,
    ttlSeconds?: number
  ) {
    const contractPoolWithSigner = this.contract.connect(signer);

    return await moveQuoteToken(
      contractPoolWithSigner,
      maxAmountToMove,
      fromIndex,
      toIndex,
      await getExpiry(this.provider, ttlSeconds)
    );
  }

  /**
   * removes quote token from a bucket
   * @param signer lender
   * @param bucketIndex identifies the price bucket
   * @param maxAmount optionally limits amount to remove
   * @returns transaction
   */
  async removeQuoteToken(signer: Signer, bucketIndex: number, maxAmount = constants.MaxUint256) {
    const contractPoolWithSigner = this.contract.connect(signer);

    return await removeQuoteToken(contractPoolWithSigner, maxAmount, bucketIndex);
  }

  /**
   * checks a lender's LP balance in a bucket
   * @param lenderAddress lender
   * @param index fenwick index of the desired bucket
   * @returns LP balance and timestamp of last deposit for the bucket
   */
  async lenderInfo(lenderAddress: Address, index: number) {
    const [lpBalance, depositTime] = await lenderInfo(this.contract, lenderAddress, index);

    // TODO: contracts use depositTime for handling bucket bankruptcy; suggest we not expose it here
    return {
      lpBalance,
      depositTime,
    };
  }

  /**
   * retrieves pool debt information
   * @returns {@link DebtInfo}
   */
  async debtInfo(): Promise<DebtInfo> {
    const [pending, accrued, inAuction] = await debtInfo(this.contract);

    return {
      pendingDebt: BigNumber.from(pending),
      accruedDebt: BigNumber.from(accrued),
      debtInAuction: BigNumber.from(inAuction),
    };
  }

  /**
   * retrieves pool loan information
   * @returns {@link LoansInfo}
   */
  async loansInfo(): Promise<LoansInfo> {
    const [maxBorrower, maxThresholdPrice, noOfLoans] = await loansInfo(this.contract);

    return {
      maxBorrower,
      maxThresholdPrice,
      noOfLoans: +noOfLoans,
    };
  }

  /**
   * retrieves pool reference prices
   * @returns {@link PriceInfo}
   */
  async getPrices(): Promise<PriceInfo> {
    const [hpb, hpbIndex, htp, htpIndex, lup, lupIndex] = await poolPricesInfo(
      this.contractUtils,
      this.poolAddress
    );

    return {
      hpb,
      hpbIndex: +hpbIndex,
      htp,
      htpIndex: +htpIndex,
      lup,
      lupIndex: +lupIndex,
    };
  }

  /**
   * retrieves pool statistics
   * @returns {@link Stats}
   */
  async getStats(): Promise<Stats> {
    const poolLoansInfoCall = this.contractUtilsMulti.poolLoansInfo(this.poolAddress);
    const poolUtilizationInfoCall = this.contractUtilsMulti.poolUtilizationInfo(this.poolAddress);
    const poolReservesInfo = this.contractUtilsMulti.poolReservesInfo(this.poolAddress);
    const data: string[] = await this.ethcallProvider.all([
      poolLoansInfoCall,
      poolUtilizationInfoCall,
      poolReservesInfo,
    ]);

    const [poolSize, loansCount] = data[0];
    const [minDebtAmount, collateralization, actualUtilization, targetUtilization] = data[1];
    const [reserves, claimableReserves, claimableReservesRemaining, auctionPrice] = data[2];

    return {
      poolSize: BigNumber.from(poolSize),
      loansCount: +loansCount,
      minDebtAmount: BigNumber.from(minDebtAmount),
      collateralization: BigNumber.from(collateralization),
      actualUtilization: BigNumber.from(actualUtilization),
      targetUtilization: BigNumber.from(targetUtilization),
      reserves: BigNumber.from(reserves),
      claimableReserves: BigNumber.from(claimableReserves),
      claimableReservesRemaining: BigNumber.from(claimableReservesRemaining),
      auctionPrice: BigNumber.from(auctionPrice),
    };
  }

  // TODO: Should return a position object, with an estimateWithdraw() method.
  async getPosition(lenderAddress: Address, bucketIndex: number, proposedWithdrawal?: BigNumber) {
    // determine how much LP the lender has in the bucket
    let insufficientLiquidityForWithdraw = false;
    const withdrawalAmountBN = proposedWithdrawal ?? BigNumber.from(0);

    // pool contract multicall to find pending debt and LPB
    const poolDebtInfoCall = this.contractMulti.debtInfo();
    const poolLenderInfoCall = this.contractMulti.lenderInfo(bucketIndex, lenderAddress);
    let data: string[] = await this.ethcallProvider.all([poolDebtInfoCall, poolLenderInfoCall]);
    const [pendingDebt] = data[0];
    const [lpBalance] = data[1];

    // info contract multicall to get htp and calculate token amounts for LPB
    const poolPricesInfoCall = this.contractUtilsMulti.poolPricesInfo(this.poolAddress);
    const lpToQuoteCall = this.contractUtilsMulti.lpToQuoteTokens(
      this.poolAddress,
      lpBalance,
      bucketIndex
    );
    const lpToCollateralCall = this.contractUtilsMulti.lpToCollateral(
      this.poolAddress,
      lpBalance,
      bucketIndex
    );
    data = await this.ethcallProvider.all([poolPricesInfoCall, lpToQuoteCall, lpToCollateralCall]);
    const [, , , htpIndex] = data[0];
    const depositRedeemable = data[1];
    const collateralRedeemable = data[2];

    // model withdraw amount as extra debt to estimate where withdrawal would move the LUP
    const pendingDebtBN = BigNumber.from(pendingDebt);
    const lupIndexAfterWithdrawal = await this.depositIndex(pendingDebtBN.add(withdrawalAmountBN));

    // if LUP goes below HTP (higher index), lender could not withdraw proposed amount
    if (lupIndexAfterWithdrawal.toNumber() > +htpIndex) {
      insufficientLiquidityForWithdraw = true;
    }

    return {
      lpBalance,
      depositRedeemable,
      collateralRedeemable,
      insufficientLiquidityForWithdraw,
    };
  }

  /**
   * measuring from highest price bucket with liquidity, determines index at which all liquidity in
   * the book has been utilized by specified debt; useful for estimating LUP
   * @param debtAmount pool debt to be applied to liquidity
   * @returns fenwick index
   */
  async depositIndex(debtAmount: BigNumber) {
    return await depositIndex(this.contract, debtAmount);
  }

  /**
   * enables signer to bundle transactions together atomically in a single request
   * @param signer consumer initiating transactions
   * @param callData array of transactions to sign and submit
   * @returns transaction
   */
  async multicall(signer: Signer, callData: Array<CallData>) {
    const contractPoolWithSigner = this.contract.connect(signer);

    return await multicall(contractPoolWithSigner, callData);
  }

  // TODO: calculate priceToIndex client-side, return any buckets with liquidity, rename accordingly
  async getIndexesPriceByRange(minPrice: BigNumber, maxPrice: BigNumber) {
    const minIndexCall = this.contractUtilsMulti.priceToIndex(minPrice);
    const maxIndexCall = this.contractUtilsMulti.priceToIndex(maxPrice);
    const response: BigNumber[][] = await this.ethcallProvider.all([minIndexCall, maxIndexCall]);

    const minIndex = response[0];
    const maxIndex = response[1];

    const indexToPriceCalls = [];

    for (let index = Number(maxIndex.toString()); index <= Number(minIndex.toString()); index++) {
      indexToPriceCalls.push(this.contractUtilsMulti.indexToPrice(index));
    }

    const responseCalls: BigNumber[] = await this.ethcallProvider.all(indexToPriceCalls);

    const buckets: { index: number; price: BigNumber }[] = [];
    let index = Number(maxIndex.toString());

    responseCalls.forEach((price, ix) => {
      const swiftIndex = index + ix;

      buckets[swiftIndex] = {
        index: swiftIndex,
        price,
      };

      index = swiftIndex;
    });

    return buckets.filter(element => !!element);
  }

  async kickWithDeposit(signer: Signer, index: number, limitIndex: number = MAX_FENWICK_INDEX) {
    const contractPoolWithSigner = this.contract.connect(signer);

    return await kickWithDeposit(contractPoolWithSigner, index, limitIndex);
  }

  async kick(signer: Signer, borrowerAddress: Address, limitIndex: number = MAX_FENWICK_INDEX) {
    const contractPoolWithSigner = this.contract.connect(signer);

    return await kick(contractPoolWithSigner, borrowerAddress, limitIndex);
  }

  async isKickable(borrowerAddress: Address) {
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
    const tp = collateral.gt(0) ? debt.div(collateral) : BigNumber.from(0);

    return lup.lte(toWad(tp));
  }

  /**
   *  called by actors to settle an amount of debt in a completed liquidation
   *  @param  borrowerAddress address of the auctioned borrower
   *  @param  maxDepth  measured from HPB, maximum number of buckets deep to settle debt,
   *                    used to prevent unbounded iteration clearing large liquidations
   */
  async settle(signer: Signer, borrowerAddress: Address, maxDepth = MAX_SETTLE_BUCKETS) {
    const contractPoolWithSigner = this.contract.connect(signer);

    return await settle(contractPoolWithSigner, borrowerAddress, maxDepth);
  }

  /**
   * called by actor to start a `Claimable Reserve Auction` (`CRA`).
   * @returns fenwick index
   */
  async kickReserveAuction(signer: Signer) {
    const contractPoolWithSigner = this.contract.connect(signer);

    return await kickReserveAuction(contractPoolWithSigner);
  }

  /**
   *  purchases claimable reserves during a `CRA` using `Ajna` token.
   *  @param maxAmount maximum amount of quote token to purchase at the current auction price.
   *  @return actual amount of reserves taken.
   */
  async takeAndBurn(signer: Signer, maxAmount: BigNumber = constants.MaxUint256) {
    const contractPoolWithSigner = this.contract.connect(signer);

    return await takeReserves(contractPoolWithSigner, maxAmount);
  }
}

export { Pool };
