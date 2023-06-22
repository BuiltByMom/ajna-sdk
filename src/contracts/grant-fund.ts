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

export async function delegateVote(signer: Signer, delegatee: Address) {
  const contractInstance: Contract = getAjnaTokenContract(signer);
  return await createTransaction(contractInstance, {
    methodName: 'delegate',
    args: [delegatee],
  });
}

export async function getVotingPower(signer: Signer, account: Address) {
  const contractInstance: Contract = getAjnaTokenContract(signer);
  return await contractInstance.getVotes(account);
}

export async function getActiveDistributionId(signer: Signer): Promise<number> {
  const contractInstance: Contract = getGrantsFundContract(signer);
  return await contractInstance.getDistributionId();
}

export async function startNewDistributionPeriod(signer: Signer) {
  const contractInstance: Contract = getGrantsFundContract(signer);
  return await createTransaction(contractInstance, {
    methodName: 'startNewDistributionPeriod',
    args: [],
  });
}

export async function getDistributionPeriod(signer: Signer, distributionId: number) {
  const contractInstance: Contract = getGrantsFundContract(signer);
  return await contractInstance.getDistributionPeriodInfo(distributionId);
}
