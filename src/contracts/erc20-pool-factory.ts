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

export async function deployPool(
  signer: Signer,
  collateralAddress: Address,
  quoteAddress: Address,
  interestRate: BigNumber,
  overrides?: TransactionOverrides
) {
  const contractInstance = getErc20PoolFactoryContract(signer);
  const tx = await contractInstance.deployPool(
    collateralAddress,
    quoteAddress,
    interestRate,
    overrides
  );

  console.log(`tx:`, tx);

  return tx;
}

export async function deployedPools(
  provider: SignerOrProvider,
  collateralAddress: Address,
  quoteAddress: Address,
  nonSubsetHash: string
) {
  const contractInstance = getErc20PoolFactoryContract(provider);

  return await contractInstance.deployedPools(nonSubsetHash, collateralAddress, quoteAddress);
}
