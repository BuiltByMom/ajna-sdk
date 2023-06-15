import ERC721PoolABI from '../abis/ERC721Pool.json';
import { Address, ERC721Pool__factory, SignerOrProvider } from '../types';
import { Contract as ContractMulti } from 'ethcall';

export const getErc721PoolContract = (poolAddress: Address, provider: SignerOrProvider) => {
  return ERC721Pool__factory.connect(poolAddress, provider);
};

export const getErc721PoolInterface = () => {
  return ERC721Pool__factory.createInterface();
};

export const getErc721PoolContractMulti = (poolAddress: Address) => {
  return new ContractMulti(poolAddress, ERC721PoolABI);
};
