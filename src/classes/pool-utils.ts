import { Erc20Address, SignerOrProvider } from '../constants/interfaces';
import {
  borrowerInfo,
  bucketInfo,
  getPoolInfoUtilsContract,
  indexToPrice,
  lpsToQuoteTokens,
  poolLoansInfo,
  poolPricesInfo,
  poolUtilizationInfo,
  priceToIndex,
} from '../contracts/get-pool-info-utils-contract';
import toWei from '../utils/to-wei';
import { Contract } from 'ethers';

class PoolUtils {
  provider: SignerOrProvider;
  contract: Contract;
  poolAddress: string;

  constructor(provider: SignerOrProvider, poolAddress: Erc20Address) {
    this.provider = provider;
    this.poolAddress = poolAddress;
    this.contract = getPoolInfoUtilsContract(this.provider);
  }

  setup = (signer: SignerOrProvider) => {
    this.contract = getPoolInfoUtilsContract(signer);
  };

  /**
   * borrowerInfo
   * @param borrowerAddress
   * @param poolAddress
   * @returns [
   *   debt_: BigNumber
   *   collateral_: BigNumber
   *   t0Np_: BigNumber
   *  ]
   */
  borrowerInfo = async (borrowerAddress: Erc20Address) => {
    const [debt, collateral, t0Np] = await borrowerInfo({
      contractPool: this.contract,
      poolAddress: this.poolAddress,
      borrowerAddress,
    });

    return { debt, collateral, t0Np };
  };

  /**
   * poolPricesInfo
   * @param poolAddress
   * @returns [
   *   hpb_: BigNumber
   *   hpbIndex_: BigNumber
   *   htp_: BigNumber
   *   htpIndex_: BigNumber
   *   lup_: BigNumber
   *   lupIndex_: BigNumber
   *  ]
   */
  poolPricesInfo = async () => {
    const [hpb, hpbIndex, htp, htpIndex, lup, lupIndex] = await poolPricesInfo({
      contractPool: this.contract,
      poolAddress: this.poolAddress,
    });

    return {
      hpb,
      hpbIndex,
      htp,
      htpIndex,
      lup,
      lupIndex,
    };
  };

  /**
   * bucketInfo
   * @param poolAddress ERC20Address
   * @param index number
   * @returns [
   *   price_: BigNumber
   *   quoteTokens_: BigNumber
   *   collateral_: BigNumber
   *   bucketLPs_: BigNumber
   *   scale_: BigNumber
   *   exchangeRate_: BigNumber
   * ]
   */
  bucketInfo = async (index: number) => {
    const [price, quoteTokens, collateral, bucketLPs, scale, exchangeRate] =
      await bucketInfo({
        contractPool: this.contract,
        poolAddress: this.poolAddress,
        index,
      });

    return {
      price,
      quoteTokens,
      collateral,
      bucketLPs,
      scale,
      exchangeRate,
    };
  };

  /**
   *  @notice Returns info related to pool loans.
   *  @param poolAddress
   *  @return poolSize_              The total amount of quote tokens in pool (WAD).
   *  @return loansCount_            The number of loans in pool.
   *  @return maxBorrower_           The address with the highest TP in pool.
   *  @return pendingInflator_       Pending inflator in pool.
   *  @return pendingInterestFactor_ Factor used to scale the inflator.
   */
  poolLoansInfo = async () => {
    const [
      poolSize,
      loansCount,
      maxBorrower,
      pendingInflator,
      pendingInterestFactor,
    ] = await poolLoansInfo({
      contractPool: this.contract,
      poolAddress: this.poolAddress,
    });

    return {
      poolSize,
      loansCount,
      maxBorrower,
      pendingInflator,
      pendingInterestFactor,
    };
  };

  /**
   *  @notice Returns info related to Claimaible Reserve Auction.
   *  @param poolAddress
   *  @return poolMinDebtAmount_     Minimum debt amount.
   *  @return poolCollateralization_ Current pool collateralization ratio.
   *  @return poolActualUtilization_ The current pool actual utilization, in WAD units.
   *  @return poolTargetUtilization_ The current pool Target utilization, in WAD units.
   */
  poolUtilizationInfo = async () => {
    const [
      minDebtAmount,
      collateralization,
      actualUtilization,
      targetUtilization,
    ] = await poolUtilizationInfo({
      contractPool: this.contract,
      poolAddress: this.poolAddress,
    });

    return {
      minDebtAmount,
      collateralization,
      actualUtilization,
      targetUtilization,
    };
  };

  /**
   *  @notice Calculate the amount of quote tokens in bucket for a given amount of LP Tokens.
   *  @param  lpTokens_    The number of lpTokens to calculate amounts for.
   *  @param  index_       The price bucket index for which the value should be calculated.
   *  @return quoteAmount_ The exact amount of quote tokens that can be exchanged for the given LP Tokens, WAD units.
   */
  lpsToQuoteTokens = async (lpTokens: number, index: number) => {
    return await lpsToQuoteTokens({
      contractPool: this.contract,
      poolAddress: this.poolAddress,
      lpTokens,
      index,
    });
  };

  priceToIndex = async (price: number) => {
    return await priceToIndex({
      contractPool: this.contract,
      price: toWei(price),
    });
  };

  indexToPrice = async (index: number) => {
    return await indexToPrice({
      contractPool: this.contract,
      index,
    });
  };
}

export { PoolUtils };
