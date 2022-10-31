import erc721PoolFactoryAbi from '../abis/ERC721PoolFactory.json';
import { CONTRACT_ERC721_POOL_FACTORY } from '../constants/config';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const getNftPoolFactoryContract = (web3: any) => {
  return new web3.eth.Contract(
    erc721PoolFactoryAbi,
    CONTRACT_ERC721_POOL_FACTORY
  );
};
