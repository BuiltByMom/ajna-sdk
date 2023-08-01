import { ethers } from 'ethers';
import { Contract as ContractMulti } from 'ethcall';
import ERC721Pool from '../abis/ERC721Pool.json';
import { Address, SignerOrProvider } from '../types';

export const getErc721PoolContract = (poolAddress: Address, provider: SignerOrProvider) => {
  return new ethers.Contract(poolAddress, ERC721Pool, provider);
};

export const getErc721PoolContractMulti = (poolAddress: Address) => {
  return new ContractMulti(poolAddress, ERC721Pool);
};
