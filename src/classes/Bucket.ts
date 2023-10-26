import { BigNumber, Contract, Signer, constants } from 'ethers';
import { MAX_FENWICK_INDEX } from '../constants';
import { multicall } from '../contracts/common';
import {
  addQuoteToken,
  lenderInfo,
  lenderKick,
  moveQuoteToken,
  removeQuoteToken,
} from '../contracts/pool';
import {
  bucketInfo,
  getPoolInfoUtilsContract,
  lpToCollateral,
  lpToQuoteTokens,
} from '../contracts/pool-info-utils';
import { Address, CallData, PoolInfoUtils, SignerOrProvider } from '../types';
import { fromWad, toWad } from '../utils/numeric';
import { indexToPrice } from '../utils/pricing';
import { getExpiry } from '../utils/time';
import { Pool } from './Pool';

export interface BucketStatus {
  /* amount of quote token, including accrued interest, owed to the bucket */
  deposit: BigNumber;
  /* amount of available/unencumbered collateral deposited into the bucket */
  collateral: BigNumber;
  /* total amount of LP in the bucket across all lenders */
  bucketLP: BigNumber;
  /* values LP balance in quote token terms */
  exchangeRate: BigNumber;
}

export interface Position {
  /** lender's LP balance of a particular bucket */
  lpBalance: BigNumber;
  /** LP balance valued in quote token, limited by bucket balance */
  depositRedeemable: BigNumber;
  /** LP balance valued in quote token, limited by bucket balance */
  collateralRedeemable: BigNumber;
  /** estimated amount of deposit which may be withdrawn without pushing the LUP below HTP */
  depositWithdrawable: BigNumber;
}

/**
 * Models a price bucket in a pool.
 */
export class Bucket {
  provider: SignerOrProvider;
  contractUtils: PoolInfoUtils;
  poolContract: Contract;
  pool: Pool;
  bucketName: string;
  index: number;
  price: BigNumber;

  /**
   * @param provider JSON-RPC endpoint.
   * @param pool     Pool to which this bucket belongs.
   * @param index    Price bucket index.
   */
  constructor(provider: SignerOrProvider, pool: Pool, index: number) {
    this.provider = provider;
    this.pool = pool;
    this.poolContract = pool.contract;
    this.contractUtils = getPoolInfoUtilsContract(this.provider);

    this.index = index;
    this.price = indexToPrice(index);
    this.bucketName = `${pool.name} bucket ${this.index} (${fromWad(this.price)})`;
  }

  toString() {
    return this.bucketName;
  }

  /**
   * Enables signer to bundle transactions together atomically in a single request.
   * @param signer consumer initiating transactions
   * @param callData array of transactions to sign and submit
   * @returns promise to transaction
   */
  async multicall(signer: Signer, callData: Array<CallData>) {
    const contractPoolWithSigner = this.poolContract.connect(signer);
    return multicall(contractPoolWithSigner, callData);
  }

  /**
   * Retrieve current state of the bucket.
   * @returns {@link BucketStatus}
   */
  async getStatus(): Promise<BucketStatus> {
    const [, deposit, collateral, bucketLP, , exchangeRate] = await bucketInfo(
      this.contractUtils,
      this.poolContract.address,
      this.index
    );

    return {
      deposit,
      collateral,
      bucketLP,
      exchangeRate,
    };
  }

  /**
   * Deposits quote token into the bucket.
   * @param signer lender
   * @param amount amount to deposit
   * @param ttlSeconds revert if not processed in this amount of block time
   * @param revertBelowLUP revert if lowest utilized price is above this bucket when processed
   * @returns promise to transaction
   */
  async addQuoteToken(
    signer: Signer,
    amount: BigNumber,
    ttlSeconds?: number,
    revertBelowLUP = false
  ) {
    const contractPoolWithSigner = this.poolContract.connect(signer);

    return addQuoteToken(
      contractPoolWithSigner,
      amount,
      this.index,
      await getExpiry(this.provider, ttlSeconds),
      revertBelowLUP
    );
  }

  /**
   * Moves quote token from current bucket to another bucket.
   * @param signer lender
   * @param toIndex price bucket to which quote token should be deposited
   * @param maxAmountToMove optionally limits amount to move
   * @param ttlSeconds revert if not processed in this amount of time
   * @param revertBelowLUP revert if lowest utilized price is above toIndex when processed
   * @returns promise to transaction
   */
  async moveQuoteToken(
    signer: Signer,
    toIndex: number,
    maxAmountToMove = constants.MaxUint256,
    ttlSeconds?: number,
    revertBelowLUP = false
  ) {
    const contractPoolWithSigner = this.poolContract.connect(signer);

    return moveQuoteToken(
      contractPoolWithSigner,
      maxAmountToMove,
      this.index,
      toIndex,
      await getExpiry(this.provider, ttlSeconds),
      revertBelowLUP
    );
  }

  /**
   * Removes quote token from the bucket.
   * @param signer lender
   * @param maxAmount optionally limits amount to remove
   * @returns promise to transaction
   */
  async removeQuoteToken(signer: Signer, maxAmount = constants.MaxUint256) {
    const contractPoolWithSigner = this.poolContract.connect(signer);

    return removeQuoteToken(contractPoolWithSigner, maxAmount, this.index);
  }

  /**
   * Shows a lender's position in a single bucket.
   * @returns {@link Position}
   */
  async getPosition(lenderAddress: Address): Promise<Position> {
    // pool contract multicall to find pending debt and LPB
    let data: Array<string> = await this.pool.ethcallProvider.all([
      this.pool.contractMulti.debtInfo(),
      this.pool.contractMulti.lenderInfo(this.index, lenderAddress),
    ]);
    const lpBalance = BigNumber.from(data[1][0]);

    // info contract multicall to get htp and calculate token amounts for LPB
    const pricesInfoCall = this.pool.contractUtilsMulti.poolPricesInfo(this.poolContract.address);
    const lpToQuoteCall = this.pool.contractUtilsMulti.lpToQuoteTokens(
      this.poolContract.address,
      lpBalance,
      this.index
    );
    const lpToCollateralCall = this.pool.contractUtilsMulti.lpToCollateral(
      this.poolContract.address,
      lpBalance,
      this.index
    );
    data = await this.pool.ethcallProvider.all([pricesInfoCall, lpToQuoteCall, lpToCollateralCall]);
    const htpIndex = +data[0][3];
    const lupIndex = +data[0][5];
    const depositRedeemable = BigNumber.from(data[1]);
    const collateralRedeemable = BigNumber.from(data[2]);

    let depositWithdrawable;
    if (this.index > lupIndex) {
      // if withdrawing below the LUP (higher index), the withdrawal cannot affect the LUP
      depositWithdrawable = depositRedeemable;
    } else {
      let liquidityBetweenLupAndHtp = toWad(0);
      // if pool is collateralized (LUP above HTP), find debt between current LUP and HTP
      if (lupIndex < htpIndex) {
        data = await this.pool.ethcallProvider.all([
          this.pool.contractMulti.depositUpToIndex(lupIndex),
          this.pool.contractMulti.depositUpToIndex(htpIndex),
        ]);
        liquidityBetweenLupAndHtp = BigNumber.from(data[1]).sub(BigNumber.from(data[0]));
      }
      depositWithdrawable = liquidityBetweenLupAndHtp.lt(depositRedeemable)
        ? liquidityBetweenLupAndHtp
        : depositRedeemable;
    }

    return {
      lpBalance,
      depositRedeemable,
      collateralRedeemable,
      depositWithdrawable,
    };
  }

  async estimateDepositFeeRate(): Promise<BigNumber> {
    // current annualized rate divided by 365 (24 hours of interest), capped at 10%
    // return Maths.min(Maths.wdiv(interestRate_, 365 * 1e18), 0.1 * 1e18);
    // return min(wdiv(interestRate, toWad(365)), toWad(0.1))
    return await this.pool.utils.contract.unutilizedDepositFeeRate(this.pool.poolAddress);
  }

  /**
   * Checks a lender's LP balance in a bucket.
   * @param lenderAddress lender
   * @param index fenwick index of the desired bucket
   * @returns LP balance
   */
  async lpBalance(lenderAddress: Address) {
    const [lpBalance] = await lenderInfo(this.poolContract, lenderAddress, this.index);
    return lpBalance;
  }

  /**
   *  Calculate how much quote token could currently be exchanged for LP.
   *  @param lpBalance amount of LP to redeem for quote token
   *  @returns The current amount of quote tokens that can be exchanged for the given LP, WAD units.
   */
  lpToQuoteTokens = async (lpTokens: BigNumber) => {
    return await lpToQuoteTokens(
      this.contractUtils,
      this.poolContract.address,
      lpTokens,
      this.index
    );
  };

  /**
   *  Calculate how much collateral could be exchanged for LP.
   *  @param lpBalance amount of LP to redeem for collateral
   *  @returns The exact amount of collateral that can be exchanged for the given LP, WAD units.
   */
  lpToCollateral = async (lpTokens: BigNumber) => {
    return await lpToCollateral(
      this.contractUtils,
      this.poolContract.address,
      lpTokens,
      this.index
    );
  };

  /**
   * Allows lender to kick a loan based on a LUP calculated as if they withdraw liquidity.
   * @param signer lender
   * @param limitIndex bucket in which lender has an LP balance
   * @returns promise to transaction
   */
  async lenderKick(signer: Signer, limitIndex: number = MAX_FENWICK_INDEX) {
    const contractPoolWithSigner = this.poolContract.connect(signer);

    return lenderKick(contractPoolWithSigner, this.index, limitIndex);
  }
}
