import erc721Abi from '../abis/ERC721.json';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const getNftContract = (web3: any, contract: string) => {
  return new web3.eth.Contract(erc721Abi, contract);
};
