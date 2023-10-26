import { BigNumber, Contract, Signer, constants } from 'ethers';
import { HOUR_TO_SECONDS, MAX_SETTLE_BUCKETS } from '../constants';
import { bucketTake, settle, take } from '../contracts/pool';
import { auctionStatus, getPoolInfoUtilsContract } from '../contracts/pool-info-utils';
import { Address, AuctionStatus, CallData, PoolInfoUtils, SignerOrProvider } from '../types';
import { getBlockTime } from '../utils/time';

/**
 * Models an auction used to liquidate an undercollateralized borrower.
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

    return Liquidation._prepareAuctionStatus(
      await getBlockTime(this.provider),
      kickTimestamp,
      collateral,
      debtToCover,
      isCollateralized,
      price,
      neutralPrice
    );
  }

  static _prepareAuctionStatus(
    currentTimestamp: number,
    kickTimestamp: BigNumber,
    collateral: BigNumber,
    debtToCover: BigNumber,
    isCollateralized: boolean,
    price: BigNumber,
    neutralPrice: BigNumber
  ) {
    const kickTimestampNumber = kickTimestamp.toNumber();
    const kickTime = new Date(kickTimestampNumber * 1000);
    const elapsedTime = currentTimestamp - kickTimestampNumber;

    const isGracePeriod = elapsedTime < HOUR_TO_SECONDS;
    const zero = constants.Zero;
    const isTakeable = !isGracePeriod && collateral.gt(zero);
    const isSettleable =
      kickTimestampNumber > 0 && (elapsedTime >= HOUR_TO_SECONDS * 72 || collateral.eq(0));

    return {
      kickTime,
      collateral,
      debtToCover,
      isTakeable,
      isCollateralized,
      price,
      neutralPrice,
      isSettleable,
    };
  }

  /**
   * Performs arb take operation during debt liquidation auction.
   * @param signer taker
   * @param bucketIndex identifies the price bucket
   * @returns promise to transaction
   */
  async arbTake(signer: Signer, bucketIndex: number) {
    const contractPoolWithSigner = this.poolContract.connect(signer);

    return bucketTake(contractPoolWithSigner, this.borrowerAddress, false, bucketIndex);
  }

  /**
   * Performs deposit take operation during debt liquidation auction.
   * @param signer taker
   * @param bucketIndex identifies the price bucket
   * @returns promise to transaction
   */
  async depositTake(signer: Signer, bucketIndex: number) {
    const contractPoolWithSigner = this.poolContract.connect(signer);

    return bucketTake(contractPoolWithSigner, this.borrowerAddress, true, bucketIndex);
  }

  // TODO: update this to support both pool types -> erc721 pool will have problems with the default value
  // ALTERNATIVE: create a new `take method for each pool type
  /**
   * called by actors to purchase collateral from the auction in exchange for quote token
   * @param signer taker
   * @param maxAmount max amount of collateral that will be taken from the auction
   * @returns promise to transaction
   */
  async take(signer: Signer, maxAmount: BigNumber = constants.MaxUint256) {
    const contractPoolWithSigner = this.poolContract.connect(signer);

    return take(contractPoolWithSigner, this.borrowerAddress, maxAmount, await signer.getAddress());
  }

  /**
   * Called by actors to purchase collateral from the auction in exchange for quote token with otption to invoke callback function.
   * @param signer taker
   * @param maxAmount max amount of collateral that will be taken from the auction
   * @param callee identifies where collateral should be sent and where quote token should be obtained
   * @param callData if provided, take will assume the callee implements IERC*Taker. Take will send collateral to
   *                 callee before passing this data to IERC*Taker.atomicSwapCallback. If not provided,
   *                 the callback function will not be invoked.
   * @returns promise to transaction
   */
  // TODO: needs to be tested properly
  async takeWithCall(signer: Signer, maxAmount: BigNumber, callee: Address, callData?: CallData) {
    const contractPoolWithSigner = this.poolContract.connect(signer);

    return take(contractPoolWithSigner, this.borrowerAddress, maxAmount, callee, callData);
  }

  /**
   *  Called by actors to settle an amount of debt in a completed liquidation.
   *  @param  signer settler
   *  @param  maxDepth  measured from HPB, maximum number of buckets deep to settle debt,
   *                    used to prevent unbounded iteration clearing large liquidations
   *  @returns promise to transaction
   */
  async settle(signer: Signer, maxDepth = MAX_SETTLE_BUCKETS) {
    const contractPoolWithSigner = this.poolContract.connect(signer);

    return settle(contractPoolWithSigner, this.borrowerAddress, maxDepth);
  }
}
