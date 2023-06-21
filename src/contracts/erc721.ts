import { ERC721__factory, SignerOrProvider } from '../types';

export const getErc721Contract = (contractAddress: string, provider: SignerOrProvider) => {
  return ERC721__factory.connect(contractAddress, provider);
};
