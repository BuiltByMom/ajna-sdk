import Web3 from 'web3';
import { AbiItem } from 'web3-utils';
import erc20Abi from '../abis/ERC20.json';

export const getGenericContract = (web3: Web3, contractAddress: string) => {
  return new web3.eth.Contract(erc20Abi as AbiItem[], contractAddress);
};
