#!/usr/bin/env ts-node

import dotenv from 'dotenv';
import { providers } from 'ethers';
import { AjnaSDK } from '../src/classes/AjnaSDK';
import { Config } from '../src/classes/Config';
import { DistributionPeriod } from '../src/types/classes';
import { SdkError } from '../src/types/core';
import { addAccountFromKeystore } from '../src/utils/add-account';
import { fromWad } from '../src/utils/numeric';
import { startDistributionPeriod } from './submitProposal';

async function run() {
  dotenv.config();
  // Configure from environment
  const provider = new providers.JsonRpcProvider(process.env.ETH_RPC_URL);
  // Use this for local testnets, where JSON keystores are unavailable.
  // const voter = addAccountFromKey(process.env.ETH_KEY || '', provider);
  // Use this for a real chain, such as Goerli or Mainnet.
  const voter = addAccountFromKeystore(process.env.VOTER_KEYSTORE || '', provider);
  const delegateeAddress: string = process.env.VOTER_ADDRESS ?? '';

  Config.fromEnvironment();
  const ajna = new AjnaSDK(provider);

  async function delegateVote() {
    const tx = await ajna.grants.delegateVote(voter, delegateeAddress);
    await tx.verifyAndSubmit();
  }

  const delegatee = await ajna.grants.getDelegates(delegateeAddress);
  console.log('Delegatee is ', fromWad(delegatee));

  await delegateVote();
  console.log('voted delegated to delegatee ', delegateeAddress);

  const getDistributionPeriod = async () => {
    let distributionPeriod: DistributionPeriod;
    try {
      distributionPeriod = await ajna.distributionPeriods.getActiveDistributionPeriod();
    } catch (e) {
      if (
        e instanceof SdkError &&
        e.message === 'There is no active distribution period, starting a new one'
      ) {
        await startDistributionPeriod(provider);
        distributionPeriod = await ajna.distributionPeriods.getActiveDistributionPeriod();
      } else {
        throw e;
      }
    }
    return distributionPeriod;
  };

  const distributionPeriodData = await getDistributionPeriod();

  console.log('distribution', distributionPeriodData);

  const fundingVotes = await ajna.grants.getVotesFunding(
    distributionPeriodData.blockNumber,
    delegateeAddress
  );
  console.log('Funding votes: ', fromWad(fundingVotes));

  const screeningVotes = await ajna.grants.getVotesScreening(
    distributionPeriodData.id,
    delegateeAddress
  );
  console.log('Funding votes: ', fromWad(screeningVotes));
}

run();
