import erc721PoolFactoryAbi from '../abis/ERC721PoolFactory.json';
import { CONTRACT_ERC721_POOL_FACTORY } from '../constants/config';
import { SignerOrProvider } from '../constants/interfaces';
import { ethers } from 'ethers';

export const getNftPoolFactoryContract = (provider: SignerOrProvider) => {
  return new ethers.Contract(
    CONTRACT_ERC721_POOL_FACTORY,
    erc721PoolFactoryAbi,
    provider
  );
};
