import ERC721Pool from '../abis/ERC721Pool.json';
import { Address, SignerOrProvider } from '../constants/interfaces';
import { ethers } from 'ethers';

export const getErc721PoolContract = (
  poolAddress: Address,
  provider: SignerOrProvider
) => {
  return new ethers.Contract(poolAddress, ERC721Pool, provider);
};
