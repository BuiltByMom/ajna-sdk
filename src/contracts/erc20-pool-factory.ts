import { Config } from '../classes/Config';
import {
  Address,
  ERC20PoolFactory__factory,
  SignerOrProvider,
  TransactionOverrides,
} from '../types';
import { createTransaction } from '../utils/transactions';
import { BigNumber, Contract, Signer } from 'ethers';

export const getErc20PoolFactoryContract = (provider: SignerOrProvider) => {
  return ERC20PoolFactory__factory.connect(Config.erc20PoolFactory, provider);
};

export const getErc20PoolFactoryInterface = () => {
  return ERC20PoolFactory__factory.createInterface();
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
