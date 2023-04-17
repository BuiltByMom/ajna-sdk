import { Contract as ContractMulti } from 'ethcall';
import { BigNumber } from 'ethers';
import PoolInfoUtilsAbi from '../abis/PoolInfoUtils.json';
import { Config } from '../classes/Config';
import { Address, SignerOrProvider, PoolInfoUtils, PoolInfoUtils__factory } from '../types';

export const getPoolInfoUtilsContract = (provider: SignerOrProvider) => {
  return PoolInfoUtils__factory.connect(Config.poolUtils, provider);
};

export const getPoolInfoUtilsContractMulti = () => {
  return new ContractMulti(Config.poolUtils, PoolInfoUtilsAbi);
};

export const borrowerInfo = async (
  contractPool: PoolInfoUtils,
  poolAddress: Address,
  borrowerAddress: Address
) => {
  return await contractPool.borrowerInfo(poolAddress, borrowerAddress);
};

export const poolPricesInfo = async (contractPool: PoolInfoUtils, poolAddress: Address) => {
  return await contractPool.poolPricesInfo(poolAddress);
};

export const poolLoansInfo = async (contractPool: PoolInfoUtils, poolAddress: Address) => {
  return await contractPool.poolLoansInfo(poolAddress);
};

export const poolUtilizationInfo = async (contractPool: PoolInfoUtils, poolAddress: Address) => {
  return await contractPool.poolUtilizationInfo(poolAddress);
};

export const bucketInfo = async (
  contractPool: PoolInfoUtils,
  poolAddress: Address,
  index: number
) => {
  return await contractPool.bucketInfo(poolAddress, index);
};

export const lpsToQuoteTokens = async (
  contractPool: PoolInfoUtils,
  poolAddress: Address,
  lpTokens: BigNumber,
  index: number
) => {
  return await contractPool.lpsToQuoteTokens(poolAddress, lpTokens, index);
};

export const lpsToCollateral = async (
  contractPool: PoolInfoUtils,
  poolAddress: Address,
  lpTokens: BigNumber,
  index: number
) => {
  return await contractPool.lpsToCollateral(poolAddress, lpTokens, index);
};

export const priceToIndex = async (contractPool: PoolInfoUtils, price: BigNumber) => {
  return await contractPool.priceToIndex(price);
};

export const indexToPrice = async (contractPool: PoolInfoUtils, index: number) => {
  return await contractPool.indexToPrice(index);
};
