import { Contract as ContractMulti, Provider as ProviderMulti } from 'ethcall';
import { BigNumber, BigNumberish, Contract, Signer, constants } from 'ethers';
import { ERC20_NON_SUBSET_HASH, MAX_FENWICK_INDEX } from '../constants';
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
  lenderInfo,
  approveLPTransferors,
  revokeLPTransferors,
  lpAllowance,
  increaseLPAllowance,
  updateInterest,
} from '../contracts/pool';
import {
  getPoolInfoUtilsContract,
  getPoolInfoUtilsContractMulti,
  poolPricesInfo,
} from '../contracts/pool-info-utils';
import { burn, getPositionManagerContract, mint } from '../contracts/position-manager';
import { Address, CallData, PoolInfoUtils, Provider, SdkError, SignerOrProvider } from '../types';
import { fromWad, toWad, wmul } from '../utils/numeric';
import { indexToPrice, priceToIndex } from '../utils/pricing';
import { ClaimableReserveAuction } from './ClaimableReserveAuction';
import { Bucket } from './Bucket';
import { PoolUtils } from './PoolUtils';
import { LPToken } from './LPToken';

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
  interestRateUpdate: BigNumber;
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
   * retrieves pool statistics
   * @returns {@link Stats}
   */
  async getStats(): Promise<Stats> {
    // PoolInfoUtils multicall
    const poolLoansInfoCall = this.contractUtilsMulti.poolLoansInfo(this.poolAddress);
    const poolUtilizationInfoCall = this.contractUtilsMulti.poolUtilizationInfo(this.poolAddress);
    const poolReservesInfo = this.contractUtilsMulti.poolReservesInfo(this.poolAddress);
    const utilsData: string[] = await this.ethcallProvider.all([
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
      interestRateUpdate: rateInfo[1],
      pendingInflator: BigNumber.from(pendingInflator),
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

  async lpAllowance(index: BigNumber, spender: Address, owner: Address) {
    return await lpAllowance(this.contract, index, spender, owner);
  }

  async increaseLPAllowance(signer: Signer, indexes: number[], amounts: BigNumberish[]) {
    const poolWithSigner = this.contract.connect(signer);
    const spender = getPositionManagerContract(signer).address;
    return await increaseLPAllowance(poolWithSigner, spender, indexes, amounts);
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
   * retrieves status of an auction kicker's liquidation bond
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
   * determines whether interest rate will increase, decrease, or remain the same as a result of
   * updating the interest rate, without regard to the 12-hour rate update interval
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
   * may be called periodically by actors to adjust interest rate if no other TXes have occurred
   * in the past 12 hours
   * @param signer actor who wants to update the interest rate
   * @returns transaction
   */
  async updateInterest(signer: Signer) {
    const contractPoolWithSigner = this.contract.connect(signer);
    return await updateInterest(contractPoolWithSigner);
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

  async approvePositionManagerLPTransferor(signer: Signer) {
    const addr = getPositionManagerContract(signer).address;
    return approveLPTransferors(signer, this.contract, [addr]);
  }

  async revokePositionManagerLPTransferor(signer: Signer) {
    const addr = getPositionManagerContract(signer).address;
    return revokeLPTransferors(signer, this.contract, [addr]);
  }

  getLPToken(tokenId: BigNumber) {
    return new LPToken(this.provider, tokenId);
  }

  /**
   * withdraw all available liquidity from the given buckets using multicall transaction (first quote token, then - collateral if LP is left)
   * @param signer address to redeem LP
   * @param bucketIndices array of bucket indices to withdraw liquidity from
   * @returns transaction
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
        depositWithdrawnEstimate.gt(bucketStatus.deposit) && bucketStatus.collateral.gt(0);

      if (withdrawCollateral) {
        callData.push({
          methodName: 'removeCollateral',
          args: [constants.MaxUint256, bucketIndex],
        });
      }
    }

    return await this.multicall(signer, callData);
  }
}
