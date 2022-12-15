import { Erc20Address, SignerOrProvider } from '../constants/interfaces';
import {
  borrowerInfo,
  bucketInfo,
  getPoolInfoUtilsContract,
  indexToPrice,
  poolLoansInfo,
  poolPricesInfo,
  poolUtilizationInfo,
  priceToIndex
} from '../contracts/get-pool-info-utils-contract';
import toWei from '../utils/to-wei';
import { Contract } from 'ethers';

class PoolUtils {
  provider: SignerOrProvider;
  contract: Contract;

  constructor(provider: SignerOrProvider) {
    this.provider = provider;
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
  borrowerInfo = async (
    borrowerAddress: Erc20Address,
    poolAddress: Erc20Address
  ) => {
    return await borrowerInfo({
      contractPool: this.contract,
      poolAddress,
      borrowerAddress
    });
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
  poolPricesInfo = async (poolAddress: Erc20Address) => {
    return await poolPricesInfo({
      contractPool: this.contract,
      poolAddress: poolAddress
    });
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
  bucketInfo = async (poolAddress: Erc20Address, index: number) => {
    return await bucketInfo({
      contractPool: this.contract,
      poolAddress,
      index
    });
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
  poolLoansInfo = async (poolAddress: Erc20Address) => {
    return await poolLoansInfo({
      contractPool: this.contract,
      poolAddress
    });
  };

  /**
   *  @notice Returns info related to Claimaible Reserve Auction.
   *  @param poolAddress
   *  @return poolMinDebtAmount_     Minimum debt amount.
   *  @return poolCollateralization_ Current pool collateralization ratio.
   *  @return poolActualUtilization_ The current pool actual utilization, in WAD units.
   *  @return poolTargetUtilization_ The current pool Target utilization, in WAD units.
   */
  poolUtilizationInfo = async (poolAddress: Erc20Address) => {
    return await poolUtilizationInfo({
      contractPool: this.contract,
      poolAddress
    });
  };

  priceToIndex = async (price: number) => {
    return await priceToIndex({
      contractPool: this.contract,
      price: toWei(price)
    });
  };

  indexToPrice = async (index: number) => {
    return await indexToPrice({
      contractPool: this.contract,
      index
    });
  };
}

export { PoolUtils };
