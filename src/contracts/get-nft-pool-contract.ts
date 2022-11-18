import Web3 from 'web3';
import { AbiItem } from 'web3-utils';
import ERC721PoolFactory from '../abis/ERC721PoolFactory.json';

export const getNftPoolContract = (web3: Web3, poolAddress: string) => {
  return new web3.eth.Contract(ERC721PoolFactory as AbiItem[], poolAddress);
};
