import { BigNumber, Contract, Signer, constants } from 'ethers';
import { MAX_FENWICK_INDEX } from '../constants';
import { multicall } from '../contracts/common';
import {
  addQuoteToken,
  kickWithDeposit,
  lenderInfo,
  moveQuoteToken,
  removeQuoteToken,
} from '../contracts/pool';
import {
  bucketInfo,
  getPoolInfoUtilsContract,
  lpToQuoteTokens,
  lpToCollateral,
} from '../contracts/pool-info-utils';
import { Address, CallData, PoolInfoUtils, SignerOrProvider } from '../types';
import { SdkError } from './types';
import { fromWad, toWad, wmul } from '../utils/numeric';
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
 * models a price bucket in a pool
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
   * enables signer to bundle transactions together atomically in a single request
   * @param signer consumer initiating transactions
   * @param callData array of transactions to sign and submit
   * @returns transaction
   */
  async multicall(signer: Signer, callData: Array<CallData>) {
    const contractPoolWithSigner = this.poolContract.connect(signer);
    return await multicall(contractPoolWithSigner, callData);
  }

  /**
   * retrieve current state of the bucket.
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
   * deposits quote token into the bucket
   * @param signer lender
   * @param amount amount to deposit
   * @param ttlSeconds revert if not processed in this amount of block time
   * @returns transaction
   */
  async addQuoteToken(signer: Signer, amount: BigNumber, ttlSeconds?: number) {
    const contractPoolWithSigner = this.poolContract.connect(signer);

    return await addQuoteToken(
      contractPoolWithSigner,
      amount,
      this.index,
      await getExpiry(this.provider, ttlSeconds)
    );
  }

  /**
   * moves quote token from current bucket to another bucket
   * @param signer lender
   * @param toIndex price bucket to which quote token should be deposited
   * @param maxAmountToMove optionally limits amount to move
   * @param ttlSeconds revert if not processed in this amount of time
   * @returns transaction
   */
  async moveQuoteToken(
    signer: Signer,
    toIndex: number,
    maxAmountToMove = constants.MaxUint256,
    ttlSeconds?: number
  ) {
    const contractPoolWithSigner = this.poolContract.connect(signer);

    return await moveQuoteToken(
      contractPoolWithSigner,
      maxAmountToMove,
      this.index,
      toIndex,
      await getExpiry(this.provider, ttlSeconds)
    );
  }

  /**
   * removes quote token from the bucket
   * @param signer lender
   * @param maxAmount optionally limits amount to remove
   * @returns transaction
   */
  async removeQuoteToken(signer: Signer, maxAmount = constants.MaxUint256) {
    const contractPoolWithSigner = this.poolContract.connect(signer);

    return await removeQuoteToken(contractPoolWithSigner, maxAmount, this.index);
  }

  /**
   * shows a lender's position in a single bucket
   * @returns {@link Position}
   */
  async getPosition(lenderAddress: Address): Promise<Position> {
    // pool contract multicall to find pending debt and LPB
    let data: string[] = await this.pool.ethcallProvider.all([
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

  /**
   * checks a lender's LP balance in a bucket
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
   *  calculate how much collateral could be exchanged for LP.
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
   * withdraw all available liquidity from the given bucket using multicall transaction (first quote token, then - collateral if LP is left)
   * @param signer address to redeem LP
   * @returns transaction
   */
  async withdrawLiquidity(signer: Signer) {
    // get bucket details
    const bucketStatus = await this.getStatus();
    // determine lender's LP balance
    const signerAddress = await signer.getAddress();
    const [lpBalance] = await this.poolContract.lenderInfo(this.index, signerAddress);
    // multiply by exchange rate to estimate amount of quote token they can withdraw
    const estimatedDepositWithdrawal = wmul(lpBalance, bucketStatus.exchangeRate);

    // if lender has nothing to redeem, exit
    if (lpBalance.eq(constants.Zero)) {
      throw new SdkError(`${signerAddress} has no LP in bucket ${this.index}`);
    }

    // if there is any quote token in the bucket, redeem LP for deposit first
    const callData: Array<CallData> = [];
    if (lpBalance && bucketStatus.deposit.gt(0)) {
      callData.push({
        methodName: 'removeQuoteToken',
        args: [constants.MaxUint256, this.index],
      });
    }

    // CAUTION: This estimate may cause revert because we cannot predict exchange rate for an
    // arbitrary future block where the TX will be processed.
    const withdrawCollateral =
      estimatedDepositWithdrawal.gt(bucketStatus.deposit) && bucketStatus.collateral.gt(0);
    if (withdrawCollateral) {
      callData.push({
        methodName: 'removeCollateral',
        args: [constants.MaxUint256, this.index],
      });
    }

    return await this.multicall(signer, callData);
  }

  async kickWithDeposit(signer: Signer, limitIndex: number = MAX_FENWICK_INDEX) {
    const contractPoolWithSigner = this.poolContract.connect(signer);

    return await kickWithDeposit(contractPoolWithSigner, this.index, limitIndex);
  }
}
