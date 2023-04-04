import erc721PoolFactoryAbi from '../abis/ERC721PoolFactory.json';
import { Config } from '../classes/Config';
import { SignerOrProvider } from '../types';
import { ethers } from 'ethers';

export const getErc721PoolFactoryContract = (provider: SignerOrProvider) => {
  return new ethers.Contract(Config.erc721PoolFactory, erc721PoolFactoryAbi, provider);
};
