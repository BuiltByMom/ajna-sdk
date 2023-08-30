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
  getPoolInfoUtilsContract,
  lpToQuoteTokens,
  lpToCollateral,
} from '../contracts/pool-info-utils';
import { Address, CallData, PoolInfoUtils, SignerOrProvider } from '../types';
import { fromWad } from '../utils/numeric';
import { indexToPrice } from '../utils/pricing';
import { getExpiry } from '../utils/time';
import { Pool } from './Pool';

// TODO: should this be modified to handle different pool types?
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
   * @returns promise to transaction
   */
  async multicall(signer: Signer, callData: Array<CallData>) {
    const contractPoolWithSigner = this.poolContract.connect(signer);
    return multicall(contractPoolWithSigner, callData);
  }

  /**
   * deposits quote token into the bucket
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
   * moves quote token from current bucket to another bucket
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
   * removes quote token from the bucket
   * @param signer lender
   * @param maxAmount optionally limits amount to remove
   * @returns promise to transaction
   */
  async removeQuoteToken(signer: Signer, maxAmount = constants.MaxUint256) {
    const contractPoolWithSigner = this.poolContract.connect(signer);

    return removeQuoteToken(contractPoolWithSigner, maxAmount, this.index);
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
   * allows lender to kick a loan based on a LUP calculated as if they withdraw liquidity
   * @param signer lender
   * @param limitIndex bucket in which lender has an LP balance
   * @returns promise to transaction
   */
  async lenderKick(signer: Signer, limitIndex: number = MAX_FENWICK_INDEX) {
    const contractPoolWithSigner = this.poolContract.connect(signer);

    return lenderKick(contractPoolWithSigner, this.index, limitIndex);
  }
}
