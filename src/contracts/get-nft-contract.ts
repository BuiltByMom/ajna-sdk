import Web3 from 'web3';
import { AbiItem } from 'web3-utils';
import erc721Abi from '../abis/ERC721.json';

export const getNftContract = (web3: Web3, contractAddress: string) => {
  return new web3.eth.Contract(erc721Abi as AbiItem[], contractAddress);
};
