import { BigNumber, Contract, ethers, Signer } from 'ethers';
import erc20PoolFactoryAbi from '../abis/ERC20PoolFactory.json';
import { CONTRACT_ERC20_POOL_FACTORY } from '../constants/config';
import { Address, SignerOrProvider } from '../constants/interfaces';
import checksumAddress from '../utils/checksum-address';
import { submitVerifiedTransactionWithGasEstimate } from '../utils/transactions';

export const getErc20PoolFactoryContract = (provider: SignerOrProvider) => {
  return new ethers.Contract(
    checksumAddress(CONTRACT_ERC20_POOL_FACTORY),
    erc20PoolFactoryAbi,
    provider
  );
};

export const deployPool = async (
  signer: Signer,
  collateralAddress: Address,
  quoteAddress: Address,
  interestRate: BigNumber
) => {
  const contractInstance: Contract = getErc20PoolFactoryContract(signer);

  return submitVerifiedTransactionWithGasEstimate(
    contractInstance,
    'deployPool',
    [collateralAddress, quoteAddress, interestRate],
    {
      from: await signer.getAddress(),
    }
  );
};

export const deployedPools = async (
  provider: SignerOrProvider,
  collateralAddress: Address,
  quoteAddress: Address,
  nonSubsetHash: string
) => {
  const contractInstance: Contract = getErc20PoolFactoryContract(provider);

  return await contractInstance.deployedPools(
    nonSubsetHash,
    collateralAddress,
    quoteAddress
  );
};
