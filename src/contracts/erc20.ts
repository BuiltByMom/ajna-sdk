import { Address, ERC20__factory, SignerOrProvider } from '../types';

export const getErc20Contract = (contractAddress: Address, provider: SignerOrProvider) => {
  return ERC20__factory.connect(contractAddress, provider);
};
