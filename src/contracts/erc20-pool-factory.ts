import erc20PoolFactoryAbi from '../abis/ERC20PoolFactory.json';
import { Config } from '../classes/Config';
import { Address, SignerOrProvider, TransactionOverrides } from '../types';
import checksumAddress from '../utils/checksum-address';
import { createTransaction } from '../utils/transactions';
import { BigNumber, Contract, Signer, ethers } from 'ethers';

export const getErc20PoolFactoryContract = (provider: SignerOrProvider) => {
  return new ethers.Contract(
    checksumAddress(Config.erc20PoolFactory),
    erc20PoolFactoryAbi,
    provider
  );
};

export async function deployPool(
  signer: Signer,
  collateralAddress: Address,
  quoteAddress: Address,
  interestRate: BigNumber,
  overrides?: TransactionOverrides
) {
  const contractInstance: Contract = getErc20PoolFactoryContract(signer);

  return await createTransaction(
    contractInstance,
    { methodName: 'deployPool', args: [collateralAddress, quoteAddress, interestRate] },
    overrides
  );
}

export async function deployedPools(
  provider: SignerOrProvider,
  collateralAddress: Address,
  quoteAddress: Address,
  nonSubsetHash: string
) {
  const contractInstance: Contract = getErc20PoolFactoryContract(provider);

  return await contractInstance.deployedPools(nonSubsetHash, collateralAddress, quoteAddress);
}
