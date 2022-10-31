import erc721PoolAbi from '../abis/ERC721Pool.json';
import { CONTRACT_ERC721_POOL } from '../constants/config';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const getNftPoolContract = (web3: any) => {
  return new web3.eth.Contract(erc721PoolAbi, CONTRACT_ERC721_POOL);
};
