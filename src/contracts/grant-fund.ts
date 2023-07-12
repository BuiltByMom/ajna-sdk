import grantsFundAbi from '../abis/GrantFund.json';
import ajnaTokenAbi from '../abis/AjnaToken.json';
import { Config } from '../classes/Config';
import { Address, SignerOrProvider } from '../types';
import checksumAddress from '../utils/checksum-address';
import { createTransaction } from '../utils/transactions';
import { Contract, Signer, ethers } from 'ethers';

export const getGrantsFundContract = (provider: SignerOrProvider) => {
  return new ethers.Contract(checksumAddress(Config.grantFund), grantsFundAbi, provider);
};

export const getAjnaTokenContract = (provider: SignerOrProvider) => {
  return new ethers.Contract(checksumAddress(Config.ajnaToken), ajnaTokenAbi, provider);
};

// Delegate
export async function delegateVote(signer: Signer, delegatee: Address) {
  const contractInstance: Contract = getAjnaTokenContract(signer);
  return await createTransaction(contractInstance, {
    methodName: 'delegate',
    args: [delegatee],
  });
}
export async function getDelegates(provider: SignerOrProvider, account: Address) {
  const contractInstance: Contract = getAjnaTokenContract(provider);
  return await contractInstance.delegates(account);
}

export async function getActiveDistributionId(provider: SignerOrProvider): Promise<number> {
  const contractInstance: Contract = getGrantsFundContract(provider);
  return await contractInstance.getDistributionId();
}

export async function startNewDistributionPeriod(signer: Signer) {
  const contractInstance: Contract = getGrantsFundContract(signer);
  return await createTransaction(contractInstance, {
    methodName: 'startNewDistributionPeriod',
    args: [],
  });
}

export async function getDistributionPeriod(provider: SignerOrProvider, distributionId: number) {
  const contractInstance: Contract = getGrantsFundContract(provider);
  return await contractInstance.getDistributionPeriodInfo(distributionId);
}

// Votes
export async function getVotesFunding(
  contract: Contract,
  distributionId: number,
  account: Address
) {
  return await contract.getVotesFunding(distributionId, account);
}

export async function getVotesScreening(
  contract: Contract,
  distributionId: number,
  account: Address
) {
  return await contract.getVotesScreening(distributionId, account);
}
