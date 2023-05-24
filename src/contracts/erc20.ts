import { ethers } from 'ethers';
import erc20Abi from '../abis/ERC20.json';
import { Address, SignerOrProvider } from '../types';

export const getErc20Contract = (contractAddress: Address, provider: SignerOrProvider) => {
  return new ethers.Contract(contractAddress, erc20Abi, provider);
};
