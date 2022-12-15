import erc20PoolFactoryAbi from '../abis/ERC20PoolFactory.json';
import { CONTRACT_ERC20_POOL_FACTORY } from '../constants/config';
import { Erc20Address, SignerOrProvider } from '../constants/interfaces';
import checksumAddress from '../utils/checksum-address';
import toWei from '../utils/to-wei';
import { Contract, Signer, ethers } from 'ethers';

export const getPoolFactoryContract = (provider: SignerOrProvider) => {
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
  const contractInstance: Contract = getPoolFactoryContract(signer);
  const interestRateParam = toWei(interestRate);

  const tx = await contractInstance.deployPool(
    collateralAddress,
    quoteAddress,
    interestRateParam,
    {
      from: await signer.getAddress(),
      gasLimit: 1000000
    }
  );

  return await tx.wait();
};

export const deployedPools = async (
  provider: SignerOrProvider,
  collateralAddress: Erc20Address,
  quoteAddress: Erc20Address,
  nonSubsetHash: string
) => {
  const contractInstance: Contract = getPoolFactoryContract(provider);

  return await contractInstance.deployedPools(
    nonSubsetHash,
    collateralAddress,
    quoteAddress
  );
};
