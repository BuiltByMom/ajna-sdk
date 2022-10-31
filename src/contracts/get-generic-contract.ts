import erc20Abi from '../abis/ERC20.json';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const getGenericContract = (web3: any, contractAddress: string) => {
  return new web3.eth.Contract(erc20Abi, contractAddress);
};
