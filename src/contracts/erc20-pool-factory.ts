import erc20PoolFactoryAbi from '../abis/ERC20PoolFactory.json';
import { CONTRACT_ERC20_POOL_FACTORY } from '../constants/config';
import { Address, SignerOrProvider } from '../constants/interfaces';
import checksumAddress from '../utils/checksum-address';
import { toWad } from '../utils/numeric';
import { Contract, Signer, ethers } from 'ethers';

export const getErc20PoolFactoryContract = (provider: SignerOrProvider) => {
  return new ethers.Contract(
    checksumAddress(CONTRACT_ERC20_POOL_FACTORY),
    erc20PoolFactoryAbi,
    provider
  );
};

export const deployPool = async (
  signer: Signer,
  collateralAddress: string,
  quoteAddress: string,
  interestRate: string
) => {
  const contractInstance: Contract = getErc20PoolFactoryContract(signer);
  const interestRateParam = toWad(interestRate);

  const tx = await contractInstance.deployPool(
    collateralAddress,
    quoteAddress,
    interestRateParam,
    {
      from: await signer.getAddress(),
      gasLimit: 1000000,
    }
  );

  return await tx.wait();
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
