import {
  bucketInfo,
  getPoolInfoUtilsContract,
  lpToQuoteTokens,
  lpToCollateral,
} from '../contracts/pool-info-utils';
import { Address, PoolInfoUtils, SignerOrProvider } from '../types';
import { BigNumber } from 'ethers';

/**
 * Models a price bucket in a pool
 */
class Bucket {
  provider: SignerOrProvider;
  contractUtils: PoolInfoUtils;
  poolAddress: string;
  index: number;
  wasInitialized: boolean;
  // All properties should be defined after initialize().
  price: BigNumber | undefined;
  deposit: BigNumber | undefined;
  collateral: BigNumber | undefined;
  bucketLPs: BigNumber | undefined;
  exchangeRate: BigNumber | undefined;

  /**
   * @param provider    JSON-RPC endpoint.
   * @param poolAddress Identifies pool to which this bucket belongs.
   * @param index       Price bucket index.
   */
  constructor(provider: SignerOrProvider, poolAddress: Address, index: number) {
    this.provider = provider;
    this.poolAddress = poolAddress;
    this.contractUtils = getPoolInfoUtilsContract(this.provider);
    this.index = index;
    this.wasInitialized = false;
  }

  /**
   * @notice Load bucket state from PoolInfoUtils contract
   */
  initialize = async () => {
    const [bucketPrice, deposit, collateral, bucketLPs, , exchangeRate] = await bucketInfo(
      this.contractUtils,
      this.poolAddress,
      this.index
    );
    this.price = bucketPrice;
    this.deposit = deposit;
    this.collateral = collateral;
    this.bucketLPs = bucketLPs;
    this.exchangeRate = exchangeRate;
    this.wasInitialized = true;
  };

  /**
   *  @notice Calculate the amount of quote tokens in bucket for a given amount of LP Tokens.
   *  @param  lpTokens_    The number of lpTokens to calculate amounts for.
   *  @return The exact amount of quote tokens that can be exchanged for the given LP Tokens, WAD units.
   */
  lpToQuoteTokens = async (lpTokens: BigNumber) => {
    return await lpToQuoteTokens(this.contractUtils, this.poolAddress, lpTokens, this.index);
  };

  /**
   *  @notice Calculate the amount of collateral in bucket for a given amount of LP Tokens.
   *  @param  lpTokens_    The number of lpTokens to calculate amounts for.
   *  @return The exact amount of collateral that can be exchanged for the given LP Tokens, WAD units.
   */
  lpToCollateral = async (lpTokens: BigNumber) => {
    return await lpToCollateral(this.contractUtils, this.poolAddress, lpTokens, this.index);
  };
}

export { Bucket };
