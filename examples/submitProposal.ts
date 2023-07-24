#!/usr/bin/env ts-node

import { AjnaSDK } from '../src/classes/AjnaSDK';
import { Config } from '../src/classes/Config';
import { addAccountFromKeystore } from '../src/utils/add-account';
import { BigNumber, providers } from 'ethers';
import dotenv from 'dotenv';
import { fromWad } from '../src/utils/numeric';
import { getProposalIdFromReceipt, startNewDistributionPeriod } from '../src/contracts/grant-fund';
import { Provider, SdkError } from '../src/types';

const CREATE_NEW_PROPOSAL = true;
// sample RC5 proposal id for goerli network: 0x22bf669502c9c2673093a4ef1dede6c878e1157eb773c221b87db4fed622256e
const EXISTING_PROPOSAL_ID = '0x22bf669502c9c2673093a4ef1dede6c878e1157eb773c221b87db4fed622256e';
// proposal description must be unique, select a different title each time
const PROPOSAL_TITLE = 'ajna community courses 5';

export const startDistributionPeriod = async (provider: Provider) => {
  // Use this for a real chain, such as Goerli or Mainnet.
  const caller = addAccountFromKeystore(process.env.VOTER_KEYSTORE || '', provider);
  const tx = await startNewDistributionPeriod(caller);
  const receipt = await tx.verify();
  console.log(fromWad(receipt), 'estimated gas required for this transaction');
  const recepit2 = await tx.verifyAndSubmit();
  console.log(recepit2);
};

async function run() {
  dotenv.config();
  // Configure from environment
  const provider = new providers.JsonRpcProvider(process.env.ETH_RPC_URL);
  // Use this for local testnets, where JSON keystores are unavailable.
  // const voter = addAccountFromKey(process.env.ETH_KEY || '', provider);
  // Use this for a real chain, such as Goerli or Mainnet.
  const caller = addAccountFromKeystore(process.env.VOTER_KEYSTORE || '', provider);
  const proposalToAddress = process.env.VOTER_ADDRESS ?? '';

  Config.fromEnvironment();
  const ajna = new AjnaSDK(provider);

  const propose = async () => {
    const tx = await ajna.distributionPeriods.createProposal(caller, {
      title: PROPOSAL_TITLE,
      recipientAddresses: [{ address: proposalToAddress, amount: '1000.00' }],
      externalLink: 'https://example.com',
    });
    const estimatedGas = await tx.verify();
    console.log(fromWad(estimatedGas), 'estimated gas required for propose transaction');
    const recepit = await tx.verifyAndSubmit();
    const proposalId = getProposalIdFromReceipt(recepit);
    console.log('proposal created with id', proposalId);
    return proposalId;
  };

  try {
    const distributionPeriod = await ajna.distributionPeriods.getActiveDistributionPeriod();
    console.log('current distribution period details:', distributionPeriod);
  } catch (e) {
    if (e instanceof SdkError && e.message === 'There is no active distribution period') {
      console.log('There is no active distribution period, starting a new one');
      await ajna.grants.startNewDistributionPeriod(caller);
    } else {
      throw e;
    }
  }
  console.log('current treasury balance:', fromWad(await ajna.grants.getTreasury()));
  const proposalId = CREATE_NEW_PROPOSAL ? await propose() : BigNumber.from(EXISTING_PROPOSAL_ID);
  const proposal = ajna.distributionPeriods.getProposal(proposalId);
  const { votesReceived, tokensRequested, fundingVotesReceived } = await proposal.getInfo();
  console.log(
    `the proposal has received ${fromWad(votesReceived)} votes and ${fromWad(
      fundingVotesReceived
    )} funding votes, with ${fromWad(tokensRequested)} tokens required`
  );
  const state = await proposal.getState();
  console.log(`the proposal is in ${state} state`);
}

run();
