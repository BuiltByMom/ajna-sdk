import { BigNumber, Contract, Signer, ethers } from 'ethers';
import ajnaTokenAbi from '../abis/AjnaToken.json';
import { Config } from '../classes/Config';
import { Address, SignerOrProvider, WrappedTransaction } from '../types';
import checksumAddress from '../utils/checksum-address';
import { createTransaction } from '../utils';

export const getAjnaTokenContract = (provider: SignerOrProvider) => {
  return new ethers.Contract(checksumAddress(Config.ajnaToken), ajnaTokenAbi, provider);
};

export async function getBalance(signer: SignerOrProvider, account: Address): Promise<BigNumber> {
  const contractInstance: Contract = getAjnaTokenContract(signer);
  return await contractInstance.balanceOf(account);
}

export async function transfer(
  signer: Signer,
  to: Address,
  amount: BigNumber
): Promise<WrappedTransaction> {
  const contractInstance: Contract = getAjnaTokenContract(signer);
  return await createTransaction(contractInstance, {
    methodName: 'transfer',
    args: [to, amount],
  });
}
