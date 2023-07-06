#!/usr/bin/env ts-node

import { AjnaSDK } from '../src/classes/AjnaSDK';
import { Config } from '../src/classes/Config';
import { addAccountFromKeystore } from '../src/utils/add-account';
import { providers } from 'ethers';
import dotenv from 'dotenv';
import { fromWad } from '../src/utils/numeric';
import { SdkError } from '../src/types';
import { startNewDistributionPeriod } from '../src/contracts/grant-fund';

const CREATE_NEW_PROPOSAL = true;
// sample RC5 proposal id for goerli network: 0x7d84a6263ae0d98d3329bd7b46bb4e8d6f98cd35a7adb45c274c8b7fd5ebd5e0
const EXISTING_PROPOSAL_ID = '';
// proposal description must be unique, select a different title each time
const PROPOSAL_TITLE = 'ajna lending improvements 4';

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

  const startDistributionPeriod = async () => {
    const tx = await startNewDistributionPeriod(caller);
    const receipt = await tx.verify();
    console.log(
      fromWad(receipt),
      'estimated gas required for startNewDistributionPeriod transaction'
    );
    const recepit2 = await tx.verifyAndSubmit();
    console.log(recepit2);
  };

  const propose = async () => {
    const tx = await ajna.distributionPeriods.createProposal(caller, {
      title: PROPOSAL_TITLE,
      recipientAddresses: [{ address: proposalToAddress, amount: '1000.00' }],
      externalLink: 'https://example.com',
    });
    const receipt = await tx.verify();
    console.log(fromWad(receipt), 'estimated gas required for propose transaction');
    const recepit2 = await tx.verifyAndSubmit();
    const proposalId = recepit2.logs[0].topics[0];
    console.log('proposal created with id', proposalId);
    return proposalId;
  };

  try {
    const distributionPeriod = await ajna.distributionPeriods.getActiveDistributionPeriod();
    console.log('current distribution period details:', distributionPeriod);
  } catch (e) {
    if (e instanceof SdkError && e.message === 'There is no active distribution period') {
      console.log('There is no active distribution period, starting a new one');
      await startDistributionPeriod();
    } else {
      throw e;
    }
  }
  const proposalId = CREATE_NEW_PROPOSAL ? await propose() : EXISTING_PROPOSAL_ID;
  const proposal = ajna.distributionPeriods.getProposal(proposalId);
  const { votesReceived, tokensRequested, fundingVotesReceived } = await proposal.getInfo();
  console.log(
    `the proposal has received ${fromWad(votesReceived)} votes and ${fromWad(
      fundingVotesReceived
    )} funding votes, with ${fromWad(tokensRequested)} tokens required`
  );
}

run();
