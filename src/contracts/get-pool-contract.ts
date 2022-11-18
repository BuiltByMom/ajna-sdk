import Web3 from 'web3';
import { AbiItem } from 'web3-utils';
import ERC20Pool from '../abis/ERC20Pool.json';

export const getPoolContract = (web3: Web3, poolAddress: string) => {
  return new web3.eth.Contract(ERC20Pool as AbiItem[], poolAddress);
};
