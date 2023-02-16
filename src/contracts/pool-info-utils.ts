import PoolInfoUtilsAbi from '../abis/PoolInfoUtils.json';
import { POOL_UTILS } from '../constants/config';
import {
  BorrowerInfoParamsContract,
  PoolBucketInfoParamsContract,
  PoolIndexToPriceParamsContract,
  PoolLpsToQuoteTokensParamsContract,
  PoolPriceToIndexParamsContract,
  PoolPricesInfoParamsContract,
  SignerOrProvider,
} from '../constants/interfaces';
import { Contract as ContractMulti } from 'ethcall';
import { ethers } from 'ethers';

export const getPoolInfoUtilsContract = (provider: SignerOrProvider) => {
  return new ethers.Contract(POOL_UTILS, PoolInfoUtilsAbi, provider);
};

export const getPoolInfoUtilsContractMulti = () => {
  return new ContractMulti(POOL_UTILS, PoolInfoUtilsAbi);
};

export const borrowerInfo = async ({
  contract: contractPool,
  poolAddress,
  borrowerAddress,
}: BorrowerInfoParamsContract) => {
  return await contractPool.borrowerInfo(poolAddress, borrowerAddress);
};

export const poolPricesInfo = async ({
  contract: contractPool,
  poolAddress,
}: PoolPricesInfoParamsContract) => {
  return await contractPool.poolPricesInfo(poolAddress);
};

export const poolLoansInfo = async ({
  contract: contractPool,
  poolAddress,
}: PoolPricesInfoParamsContract) => {
  return await contractPool.poolLoansInfo(poolAddress);
};

export const poolUtilizationInfo = async ({
  contract: contractPool,
  poolAddress,
}: PoolPricesInfoParamsContract) => {
  return await contractPool.poolUtilizationInfo(poolAddress);
};

export const bucketInfo = async ({
  contract: contractPool,
  poolAddress,
  index,
}: PoolBucketInfoParamsContract) => {
  return await contractPool.bucketInfo(poolAddress, index);
};

export const lpsToQuoteTokens = async ({
  contract: contractPool,
  poolAddress,
  lpTokens,
  index,
}: PoolLpsToQuoteTokensParamsContract) => {
  return await contractPool.lpsToQuoteTokens(poolAddress, lpTokens, index);
};

export const priceToIndex = async ({
  contract: contractPool,
  price,
}: PoolPriceToIndexParamsContract) => {
  return await contractPool.priceToIndex(price);
};

export const indexToPrice = async ({
  contract: contractPool,
  index,
}: PoolIndexToPriceParamsContract) => {
  return await contractPool.indexToPrice(index);
};
