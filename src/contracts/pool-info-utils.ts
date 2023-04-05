import { Contract as ContractMulti } from 'ethcall';
import { BigNumber, Contract, ethers } from 'ethers';
import PoolInfoUtilsAbi from '../abis/PoolInfoUtils.json';
import { Config } from '../classes/Config';
import { Address, SignerOrProvider } from '../types';

export const getPoolInfoUtilsContract = (provider: SignerOrProvider) => {
  return new ethers.Contract(Config.poolUtils, PoolInfoUtilsAbi, provider);
};

export const getPoolInfoUtilsContractMulti = () => {
  return new ContractMulti(Config.poolUtils, PoolInfoUtilsAbi);
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

export const lpsToCollateral = async (
  contractPool: Contract,
  poolAddress: Address,
  lpTokens: BigNumber,
  index: number
) => {
  return await contractPool.lpsToCollateral(poolAddress, lpTokens, index);
};

export const priceToIndex = async (contractPool: Contract, price: BigNumber) => {
  return await contractPool.priceToIndex(price);
};

export const indexToPrice = async (contractPool: Contract, index: number) => {
  return await contractPool.indexToPrice(index);
};
