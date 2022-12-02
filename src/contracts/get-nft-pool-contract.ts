import ERC721PoolFactory from '../abis/ERC721PoolFactory.json';
import { SignerOrProvider } from '../constants/interfaces';
import { ethers } from 'ethers';

export const getNftPoolContract = (
  contractAddress: string,
  provider: SignerOrProvider
) => {
  return new ethers.Contract(contractAddress, ERC721PoolFactory, provider);
};
