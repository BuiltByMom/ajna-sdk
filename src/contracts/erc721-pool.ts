import { Address, ERC721Pool__factory, SignerOrProvider } from '../types';

export const getErc721PoolContract = (poolAddress: Address, provider: SignerOrProvider) => {
  return ERC721Pool__factory.connect(poolAddress, provider);
};
