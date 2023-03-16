import erc721Abi from '../abis/ERC721.json';
import { SignerOrProvider } from '../constants/interfaces';
import { ethers } from 'ethers';

export const getNftContract = (contractAddress: string, provider: SignerOrProvider) => {
  return new ethers.Contract(contractAddress, erc721Abi, provider);
};
