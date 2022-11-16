import ERC20Pool from '../abis/ERC20Pool.json';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const getPoolContract = (web3: any, poolAddress: string) => {
  return new web3.eth.Contract(ERC20Pool, poolAddress);
};
