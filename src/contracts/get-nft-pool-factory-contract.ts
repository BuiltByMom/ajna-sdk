import Web3 from 'web3';
import { AbiItem } from 'web3-utils';
import erc721PoolFactoryAbi from '../abis/ERC721PoolFactory.json';
import { CONTRACT_ERC721_POOL_FACTORY } from '../constants/config';

export const getNftPoolFactoryContract = (web3: Web3) => {
  return new web3.eth.Contract(
    erc721PoolFactoryAbi as AbiItem[],
    CONTRACT_ERC721_POOL_FACTORY
  );
};
