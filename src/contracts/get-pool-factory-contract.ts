import Web3 from 'web3';
import { AbiItem } from 'web3-utils';
import erc20PoolFactoryAbi from '../abis/ERC20PoolFactory.json';
import { Contract } from 'web3-eth-contract';
import toWei from '../utils/to-wei';
import nonSubsetHash from '../utils/non-subset-hash';
import { CONTRACT_ERC20_POOL_FACTORY } from '../constants/config';

export const getPoolFactoryContract = (web3: Web3) => {
  return new web3.eth.Contract(
    erc20PoolFactoryAbi as AbiItem[],
    CONTRACT_ERC20_POOL_FACTORY
  );
};

export const deployPool = async (
  web3: Web3,
  collateralAddress: string,
  quoteAddress: string,
  from: string,
  interestRate: string | number
) => {
  const contractInstance: Contract = getPoolFactoryContract(web3);
  const interestRateParam = toWei(interestRate);

  const poolCreationTx = contractInstance.methods.deployPool(
    collateralAddress,
    quoteAddress,
    interestRateParam
  );

  return await poolCreationTx.send({
    from,
    gas: await poolCreationTx.estimateGas()
  });
};

export const deployedPools = async (
  web3: Web3,
  collateralAddress: string,
  quoteAddress: string
) => {
  const contractInstance: Contract = getPoolFactoryContract(web3);
  const nonSubsetHashParam = nonSubsetHash();

  return await contractInstance.methods
    .deployedPools(nonSubsetHashParam, collateralAddress, quoteAddress)
    .call();
};
