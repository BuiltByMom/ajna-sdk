import erc721Abi from '../abis/ERC721.json';
import { Address, SignerOrProvider, WrappedTransaction } from '../types';
import { BigNumber, Contract, Signer, ethers } from 'ethers';
import { createTransaction } from '../utils';

export const getNftContract = (contractAddress: string, provider: SignerOrProvider) => {
  return new ethers.Contract(contractAddress, erc721Abi, provider);
};

export async function transferFrom(
  signer: Signer,
  from: Address,
  to: Address,
  amount: BigNumber,
  contractAddress: Address
): Promise<WrappedTransaction> {
  const contractInstance: Contract = getNftContract(contractAddress, signer);
  return await createTransaction(contractInstance, {
    methodName: 'transferFrom',
    args: [from, to, amount],
  });
}
