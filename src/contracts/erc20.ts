import erc20Abi from '../abis/ERC20.json';
import DSTokenAbi from '../abis/DSToken.json';
import { Address, SignerOrProvider, WrappedTransaction } from '../types';
import { BigNumber, Contract, Signer, ethers } from 'ethers';
import ajnaTokenAbi from '../abis/AjnaToken.json';
import { Config } from '../classes/Config';
import checksumAddress from '../utils/checksum-address';
import { createTransaction } from '../utils';

export const getErc20Contract = (contractAddress: Address, provider: SignerOrProvider) => {
  return new ethers.Contract(contractAddress, erc20Abi, provider);
};

export const getDSTokenContract = (contractAddress: Address, provider: SignerOrProvider) => {
  return new ethers.Contract(contractAddress, DSTokenAbi, provider);
};

export const getAjnaTokenContract = (provider: SignerOrProvider) => {
  return new ethers.Contract(checksumAddress(Config.ajnaToken), ajnaTokenAbi, provider);
};

export async function getBalance(
  signer: SignerOrProvider,
  account: Address,
  contractAddress: Address
): Promise<BigNumber> {
  const contractInstance: Contract = getErc20Contract(contractAddress, signer);
  return await contractInstance.balanceOf(account);
}

export async function transfer(
  signer: Signer,
  to: Address,
  amount: BigNumber,
  contractAddress: Address
): Promise<WrappedTransaction> {
  const contractInstance: Contract = getErc20Contract(contractAddress, signer);
  return await createTransaction(contractInstance, {
    methodName: 'transfer',
    args: [to, amount],
  });
}

export async function getAjnaBalance(
  signer: SignerOrProvider,
  account: Address
): Promise<BigNumber> {
  const contractInstance: Contract = getAjnaTokenContract(signer);
  return await contractInstance.balanceOf(account);
}

export async function transferAjna(
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
