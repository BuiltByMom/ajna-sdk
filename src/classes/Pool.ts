import { Contract as ContractMulti, Provider as ProviderMulti } from 'ethcall';
import { BigNumber, Signer, constants } from 'ethers';
import { ERC20_NON_SUBSET_HASH, MAX_FENWICK_INDEX } from '../constants';
import { multicall } from '../contracts/common';
import { getErc20Contract } from '../contracts/erc20';
import { approve } from '../contracts/erc20-pool';
import {
  collateralAddress,
  debtInfo,
  depositIndex,
  kick,
  quoteTokenAddress,
  quoteTokenScale,
  withdrawBonds,
} from '../contracts/pool';
import {
  getPoolInfoUtilsContract,
  poolPricesInfo,
} from '../contracts/pool-info-utils';
import { burn, mint } from '../contracts/position-manager';
import {
  Address,
  CallData,
  Provider,
  SignerOrProvider,
  POOLS_CONTRACTS,
  PoolInfoUtils,
} from '../types';
import { toWad } from '../utils/numeric';
import { priceToIndex } from '../utils/pricing';
import { ClaimableReserveAuction } from './ClaimableReserveAuction';
import { Bucket } from './Bucket';
import { PoolUtils } from './PoolUtils';
import { SdkError } from './types';
import { LPToken } from './LPToken';

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
}

/**
 * Abstract baseclass used for pools, regardless of collateral type.
 */
export abstract class Pool {
  provider: SignerOrProvider;
  contract: POOLS_CONTRACTS;
  contractMulti: ContractMulti;
  poolInfoContractUtils: PoolInfoUtils;
  poolAddress: Address;
  collateralAddress: Address;
  collateralSymbol: string | undefined;
  quoteAddress: Address;
  quoteSymbol: string | undefined;
  ajnaAddress: Address;
  name: string;
  utils: PoolUtils;
  ethcallProvider: ProviderMulti;

  constructor(
    provider: SignerOrProvider,
    poolAddress: string,
    ajnaAddress: string,
    contract: POOLS_CONTRACTS,
    contractMulti: ContractMulti
  ) {
    this.provider = provider;
    this.poolAddress = poolAddress;
    this.poolInfoContractUtils = getPoolInfoUtilsContract(provider);
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
   * @param allowance normalized approval amount (or MaxUint256)
   * @returns transaction
   */
  async quoteApprove(signer: Signer, allowance: BigNumber) {
    const denormalizedAllowance = allowance.eq(constants.MaxUint256)
      ? allowance
      : allowance.div(await quoteTokenScale(this.contract));
    return await approve(signer, this.poolAddress, this.quoteAddress, denormalizedAllowance);
  }

  /**
   * retrieves pool reference prices
   * @returns {@link PriceInfo}
   */
  async getPrices(): Promise<PriceInfo> {
    const [hpb, hpbIndex, htp, htpIndex, lup, lupIndex] = await poolPricesInfo(
      this.poolInfoContractUtils,
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
    const [poolSize, loansCount] = await this.poolInfoContractUtils.poolLoansInfo(this.poolAddress);
    const [minDebtAmount, collateralization, actualUtilization, targetUtilization] =
      await this.poolInfoContractUtils.poolUtilizationInfo(this.poolAddress);
    const [reserves, claimableReserves, claimableReservesRemaining, auctionPrice] =
      await this.poolInfoContractUtils.poolReservesInfo(this.poolAddress);

    const [debt, , liquidationDebt] = await debtInfo(this.contract);

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

  /**
   * @param bucketIndex fenwick index of the desired bucket
   * @returns {@link Bucket} modeling bucket at specified index
   */
  async getBucketByIndex(bucketIndex: number) {
    const bucket = new Bucket(this.provider, this, bucketIndex);
    return bucket;
  }

  /**
   * @param price price within range supported by Ajna
   * @returns {@link Bucket} modeling bucket at nearest to specified price
   */
  async getBucketByPrice(price: BigNumber) {
    const bucketIndex = priceToIndex(price);
    // priceToIndex should throw upon invalid price
    const bucket = new Bucket(this.provider, this, bucketIndex);
    return bucket;
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

  async kick(signer: Signer, borrowerAddress: Address, limitIndex: number = MAX_FENWICK_INDEX) {
    const contractPoolWithSigner = this.contract.connect(signer);

    return await kick(contractPoolWithSigner, borrowerAddress, limitIndex);
  }

  async isKickable(borrowerAddress: Address) {
    const poolPricesInfo = await this.poolInfoContractUtils.poolPricesInfo(this.poolAddress);
    const borrowerInfo = await this.poolInfoContractUtils.borrowerInfo(
      this.poolAddress,
      borrowerAddress
    );

    const [, , , , lup] = poolPricesInfo;
    const [debt, collateral] = borrowerInfo;
    const tp = collateral.gt(0) ? debt.div(collateral) : BigNumber.from(0);

    return lup.lte(toWad(tp));
  }

  /**
   * called by kickers to withdraw liquidation bond from one or more auctions kicked
   * @param signer kicker
   * @param maxAmount optional amount of bond to withdraw; defaults to all
   * @returns transaction
   */
  async withdrawBonds(signer: Signer, maxAmount: BigNumber = constants.MaxUint256) {
    const contractPoolWithSigner = this.contract.connect(signer);
    const recipient = await signer.getAddress();
    return await withdrawBonds(contractPoolWithSigner, recipient, maxAmount);
  }

  /**
   * returns `Claimable Reserve Auction` (`CRA`) wrapper object
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

  async mintLPToken(signer: Signer) {
    return mint(signer, await signer.getAddress(), this.poolAddress, ERC20_NON_SUBSET_HASH);
  }

  async burnLPToken(signer: Signer, tokenId: BigNumber) {
    return burn(signer, tokenId, this.poolAddress);
  }

  getLPToken(tokenId: BigNumber) {
    return new LPToken(this.provider, tokenId);
  }
}
