import PoolInfoUtilsAbi from '../abis/PoolInfoUtils.json';
import { POOL_UTILS } from '../constants/config';
import { Address, SignerOrProvider } from '../types';
import { Contract as ContractMulti } from 'ethcall';
import { BigNumber, Contract, ethers } from 'ethers';

export const getPoolInfoUtilsContract = (provider: SignerOrProvider) => {
  return new ethers.Contract(POOL_UTILS, PoolInfoUtilsAbi, provider);
};

export const getPoolInfoUtilsContractMulti = () => {
  return new ContractMulti(POOL_UTILS, PoolInfoUtilsAbi);
};

export const borrowerInfo = async (
  contractPool: Contract,
  poolAddress: Address,
  borrowerAddress: Address
) => {
  return await contractPool.borrowerInfo(poolAddress, borrowerAddress);
};

export const poolPricesInfo = async (contractPool: Contract, poolAddress: Address) => {
  return await contractPool.poolPricesInfo(poolAddress);
};

export const poolLoansInfo = async (contractPool: Contract, poolAddress: Address) => {
  return await contractPool.poolLoansInfo(poolAddress);
};

export const poolUtilizationInfo = async (contractPool: Contract, poolAddress: Address) => {
  return await contractPool.poolUtilizationInfo(poolAddress);
};

export const bucketInfo = async (contractPool: Contract, poolAddress: Address, index: number) => {
  return await contractPool.bucketInfo(poolAddress, index);
};

export const lpsToQuoteTokens = async (
  contractPool: Contract,
  poolAddress: Address,
  lpTokens: BigNumber,
  index: number
) => {
  return await contractPool.lpsToQuoteTokens(poolAddress, lpTokens, index);
};

export const priceToIndex = async (contractPool: Contract, price: BigNumber) => {
  return await contractPool.priceToIndex(price);
};

export const indexToPrice = async (contractPool: Contract, index: number) => {
  return await contractPool.indexToPrice(index);
};
