import ERC721PoolFactory from '../abis/ERC721PoolFactory.json';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const getNftPoolContract = (web3: any, poolAddress: string) => {
  return new web3.eth.Contract(ERC721PoolFactory, poolAddress);
};
