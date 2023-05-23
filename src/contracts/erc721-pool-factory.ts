import { Config } from '../classes/Config';
import { ERC721PoolFactory__factory, SignerOrProvider } from '../types';

export const getErc721PoolFactoryContract = (provider: SignerOrProvider) => {
  return ERC721PoolFactory__factory.connect(Config.erc721PoolFactory, provider);
};
