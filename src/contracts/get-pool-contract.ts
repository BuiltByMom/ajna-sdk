import ERC20PoolFactory from '../abis/ERC20PoolFactory.json';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const getPoolContract = (web3: any, contractAddress: string) => {
  return new web3.eth.Contract(ERC20PoolFactory, contractAddress);
};
