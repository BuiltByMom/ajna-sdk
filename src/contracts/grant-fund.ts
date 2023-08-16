import { TransactionReceipt } from '@ethersproject/providers';
import { BigNumber, Contract, Signer, ethers } from 'ethers';
import grantsFundAbi from '../abis/GrantFund.json';
import ajnaTokenAbi from '../abis/AjnaToken.json';
import { Config } from '../classes/Config';
import { getAjnaTokenContract } from './common';
import { Address, FormattedVoteParams, ProposalParams, SignerOrProvider } from '../types';
import checksumAddress from '../utils/checksum-address';
import { createTransaction } from '../utils/transactions';

export const getGrantsFundContract = (provider: SignerOrProvider) => {
  return new ethers.Contract(checksumAddress(Config.grantFund), grantsFundAbi, provider);
};

export async function getTotalSupply(provider: SignerOrProvider) {
  const contractInstance: Contract = getAjnaTokenContract(provider);
  return await contractInstance.totalSupply();
}

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

// Distribution period
export async function getCurrentDistributionId(provider: SignerOrProvider): Promise<number> {
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

export async function getTreasury(provider: SignerOrProvider): Promise<BigNumber> {
  const contractInstance: Contract = getGrantsFundContract(provider);
  return await contractInstance.treasury();
}

export async function getStage(provider: SignerOrProvider) {
  const contractInstance = getGrantsFundContract(provider);
  return await contractInstance.getStage();
}

// Proposals
export async function createProposal(
  signer: Signer,
  { recipientAddresses, ...rest }: ProposalParams
) {
  const iface = new ethers.utils.Interface(ajnaTokenAbi);
  const encodedTransferCalls = recipientAddresses.map(({ address, amount }) =>
    iface.encodeFunctionData('transfer', [address, ethers.utils.parseEther(amount)])
  );
  const contractInstance: Contract = getGrantsFundContract(signer);
  const description = JSON.stringify(rest);
  // targets and values are the same for every recipient
  const targets = recipientAddresses.map(() => Config.ajnaToken);
  const values = recipientAddresses.map(() => 0);
  return await createTransaction(contractInstance, {
    methodName: 'propose',
    args: [targets, values, encodedTransferCalls, description],
  });
}

export function getProposalIdFromReceipt(receipt: TransactionReceipt): BigNumber {
  const iface = new ethers.utils.Interface(grantsFundAbi);
  const logDescription = iface.parseLog(receipt.logs[0]);
  return logDescription.args[0];
}

export async function getProposalInfo(provider: SignerOrProvider, distributionId: BigNumber) {
  const contractInstance: Contract = getGrantsFundContract(provider);
  return await contractInstance.getProposalInfo(distributionId);
}

export async function getProposalState(provider: SignerOrProvider, distributionId: BigNumber) {
  const contractInstance: Contract = getGrantsFundContract(provider);
  return await contractInstance.state(distributionId);
}

// Voting
export async function getVotesScreening(
  provider: SignerOrProvider,
  distributionId: number,
  account: Address
) {
  const contractInstance = getGrantsFundContract(provider);
  return await contractInstance.getVotesScreening(distributionId, account);
}

export async function getVotesFunding(
  provider: SignerOrProvider,
  distributionId: number,
  account: Address
) {
  const contractInstance = getGrantsFundContract(provider);
  return await contractInstance.getVotesFunding(distributionId, account);
}

export async function getVoterInfo(
  provider: SignerOrProvider,
  distributionId: number,
  account: Address
) {
  const contractInstance = getGrantsFundContract(provider);
  return await contractInstance.getVoterInfo(distributionId, account);
}

export async function getScreeningVotesCast(
  provider: SignerOrProvider,
  distributionId: number,
  account: Address
) {
  const contractInstance = getGrantsFundContract(provider);
  return await contractInstance.getScreeningVotesCast(distributionId, account);
}

export async function getFundingVotesCast(
  provider: SignerOrProvider,
  distributionId: number,
  account: Address
) {
  const contractInstance = getGrantsFundContract(provider);
  return await contractInstance.getFundingVotesCast(distributionId, account);
}

export async function screeningVote(signer: Signer, votes: FormattedVoteParams[]) {
  const contractInstance: Contract = getGrantsFundContract(signer);
  return await createTransaction(contractInstance, {
    methodName: 'screeningVote',
    args: [votes],
  });
}

export async function fundingVote(signer: Signer, votes: FormattedVoteParams[]) {
  const contractInstance: Contract = getGrantsFundContract(signer);
  return await createTransaction(contractInstance, {
    methodName: 'fundingVote',
    args: [votes],
  });
}

export async function updateSlate(
  signer: Signer,
  proposalIds: BigNumber[],
  distributionId: number
) {
  const contractInstance: Contract = getGrantsFundContract(signer);
  return await createTransaction(contractInstance, {
    methodName: 'updateSlate',
    args: [proposalIds, distributionId],
  });
}

export async function getFundedProposalSlate(
  provider: SignerOrProvider,
  slateHash: string
): Promise<BigNumber[]> {
  const contractInstance: Contract = getGrantsFundContract(provider);
  return await contractInstance.getFundedProposalSlate(slateHash);
}
