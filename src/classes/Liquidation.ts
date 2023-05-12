import { auctionStatus, getPoolInfoUtilsContract } from '../contracts/pool-info-utils';
import { BigNumber, Contract, Signer, constants } from 'ethers';
import { Address, CallData, PoolInfoUtils, SignerOrProvider } from 'types';
import { getBlockTime } from '../utils/time';
import { MAX_SETTLE_BUCKETS } from '../constants';
import { settle } from '../contracts/pool';
import { bucketTake, take } from '../contracts/erc20-pool';

export interface AuctionStatus {
  /** time auction was kicked */
  kickTime: Date;
  /** remaining collateral available to be purchased */
  collateral: BigNumber;
  /** remaining borrower debt to be covered */
  debtToCover: BigNumber;
  /** true if the grace period has elapsed and the auction has not expired */
  isTakeable: boolean;
  /** helps determine if the liquidation may be settled */
  isCollateralized: boolean;
  /** current price of the auction */
  price: BigNumber;
  /** price at which bond holder is neither rewarded nor penalized */
  neutralPrice: BigNumber;
}

/**
 * Models an auction used to liquidate an undercollateralized borrower
 */
export class Liquidation {
  provider: SignerOrProvider;
  poolContract: Contract;
  utilsContract: PoolInfoUtils;
  borrowerAddress: Address;

  /**
   * @param provider        JSON-RPC endpoint.
   * @param pool            Identifies pool to which this bucket belongs.
   * @param borrowerAddress Identifies the loan being liquidated.
   */
  constructor(provider: SignerOrProvider, pool: Contract, borrowerAddress: Address) {
    this.provider = provider;
    this.poolContract = pool;
    this.utilsContract = getPoolInfoUtilsContract(this.provider);
    this.borrowerAddress = borrowerAddress;
  }

  /**
   *  Retrieve current state of the auction.
   *  @returns {@link AuctionStatus}
   */
  async getStatus(): Promise<AuctionStatus> {
    const [kickTimestamp, collateral, debtToCover, isCollateralized, price, neutralPrice] =
      await auctionStatus(this.utilsContract, this.poolContract.address, this.borrowerAddress);

    const kickTimestampNumber = kickTimestamp.toNumber();
    const kickTime = new Date(kickTimestampNumber * 1000);
    const currentTimestampNumber = await getBlockTime(this.provider);
    const isGracePeriod = currentTimestampNumber - kickTimestampNumber < 3600;
    const isExpired = currentTimestampNumber >= kickTimestampNumber + 72 * 3600;
    const isTakeable = !isGracePeriod && !isExpired;

    return {
      kickTime,
      collateral,
      debtToCover,
      isTakeable,
      isCollateralized,
      price,
      neutralPrice,
    };
  }

  /**
   * performs arb take operation during debt liquidation auction
   * @param signer taker
   * @param bucketIndex identifies the price bucket
   * @returns transaction
   */
  async arbTake(signer: Signer, bucketIndex: number) {
    const contractPoolWithSigner = this.poolContract.connect(signer);

    return await bucketTake(contractPoolWithSigner, this.borrowerAddress, false, bucketIndex);
  }

  /**
   * performs deposit take operation during debt liquidation auction
   * @param signer taker
   * @param bucketIndex identifies the price bucket
   * @returns transaction
   */
  async depositTake(signer: Signer, bucketIndex: number) {
    const contractPoolWithSigner = this.poolContract.connect(signer);

    return await bucketTake(contractPoolWithSigner, this.borrowerAddress, true, bucketIndex);
  }

  /**
   * called by actors to purchase collateral from the auction in exchange for quote token
   * @param signer taker
   * @param maxAmount max amount of collateral that will be taken from the auction
   * @returns transaction
   */
  async take(signer: Signer, maxAmount: BigNumber = constants.MaxUint256) {
    const contractPoolWithSigner = this.poolContract.connect(signer);

    return await take(
      contractPoolWithSigner,
      this.borrowerAddress,
      maxAmount,
      await signer.getAddress()
    );
  }

  /**
   * called by actors to purchase collateral from the auction in exchange for quote token with otption to invoke callback function
   * @param signer taker
   * @param maxAmount max amount of collateral that will be taken from the auction
   * @param callee identifies where collateral should be sent and where quote token should be obtained
   * @param callData if provided, take will assume the callee implements IERC*Taker. Take will send collateral to
   *                 callee before passing this data to IERC*Taker.atomicSwapCallback. If not provided,
   *                 the callback function will not be invoked.
   * @returns transaction
   */
  // TODO: needs to be tested properly
  async takeWithCall(signer: Signer, maxAmount: BigNumber, callee: Address, callData?: CallData) {
    const contractPoolWithSigner = this.poolContract.connect(signer);

    return await take(contractPoolWithSigner, this.borrowerAddress, maxAmount, callee, callData);
  }

  /**
   *  called by actors to settle an amount of debt in a completed liquidation
   *  @param  signer settler
   *  @param  maxDepth  measured from HPB, maximum number of buckets deep to settle debt,
   *                    used to prevent unbounded iteration clearing large liquidations
   */
  async settle(signer: Signer, maxDepth = MAX_SETTLE_BUCKETS) {
    const contractPoolWithSigner = this.poolContract.connect(signer);

    return await settle(contractPoolWithSigner, this.borrowerAddress, maxDepth);
  }
}
