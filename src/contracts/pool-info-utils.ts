import { BigNumber } from 'ethers';
import { Config } from '../classes/Config';
import { Address, SignerOrProvider, PoolInfoUtils, PoolInfoUtils__factory } from '../types';

export const getPoolInfoUtilsContract = (provider: SignerOrProvider) => {
  return PoolInfoUtils__factory.connect(Config.poolUtils, provider);
};

export const getPoolInfoUtilsContractMulti = (provider: SignerOrProvider) => {
  return PoolInfoUtils__factory.connect(Config.poolUtils, provider);
};

export const auctionStatus = async (
  contractUtils: PoolInfoUtils,
  poolAddress: Address,
  borrowerAddress: Address
) => {
  return await contractUtils.auctionStatus(poolAddress, borrowerAddress);
};

export const borrowerInfo = async (
  contractUtils: PoolInfoUtils,
  poolAddress: Address,
  borrowerAddress: Address
) => {
  return await contractUtils.borrowerInfo(poolAddress, borrowerAddress);
};

export const poolPricesInfo = async (contractUtils: PoolInfoUtils, poolAddress: Address) => {
  return await contractUtils.poolPricesInfo(poolAddress);
};

export const poolLoansInfo = async (contractUtils: PoolInfoUtils, poolAddress: Address) => {
  return await contractUtils.poolLoansInfo(poolAddress);
};

export const poolUtilizationInfo = async (contractUtils: PoolInfoUtils, poolAddress: Address) => {
  return await contractUtils.poolUtilizationInfo(poolAddress);
};

export const bucketInfo = async (
  contractUtils: PoolInfoUtils,
  poolAddress: Address,
  index: number
) => {
  return await contractUtils.bucketInfo(poolAddress, index);
};

export const lpToQuoteTokens = async (
  contractUtils: PoolInfoUtils,
  poolAddress: Address,
  lpTokens: BigNumber,
  index: number
) => {
  return await contractUtils.lpToQuoteTokens(poolAddress, lpTokens, index);
};

export const lpToCollateral = async (
  contractUtils: PoolInfoUtils,
  poolAddress: Address,
  lpTokens: BigNumber,
  index: number
) => {
  return await contractUtils.lpToCollateral(poolAddress, lpTokens, index);
};

export const priceToIndex = async (contractUtils: PoolInfoUtils, price: BigNumber) => {
  return await contractUtils.priceToIndex(price);
};

export const indexToPrice = async (contractUtils: PoolInfoUtils, index: number) => {
  return await contractUtils.indexToPrice(index);
};
