import { createTransaction } from '../utils';
import { Config } from '../classes/Config';
import {
  Address,
  ERC20PoolFactory__factory,
  SignerOrProvider,
  TransactionOverrides,
} from '../types';
import checksumAddress from '../utils/checksum-address';
import { BigNumber, Signer } from 'ethers';

export const getErc20PoolFactoryContract = (provider: SignerOrProvider) => {
  return ERC20PoolFactory__factory.connect(checksumAddress(Config.erc20PoolFactory), provider);
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
  const erc20PoolFactory = getErc20PoolFactoryContract(signer);
  return createTransaction(erc20PoolFactory, {
    methodName: 'deployPool',
    args: [collateralAddress, quoteAddress, interestRate],
    overrides,
  });
}

export async function deployedPools(
  provider: SignerOrProvider,
  collateralAddress: Address,
  quoteAddress: Address,
  nonSubsetHash: string
) {
  const erc20PoolFactory = getErc20PoolFactoryContract(provider);

  return await erc20PoolFactory.functions.deployedPools(
    nonSubsetHash,
    collateralAddress,
    quoteAddress
  );
}
