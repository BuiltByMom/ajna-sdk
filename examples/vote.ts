#!/usr/bin/env ts-node

import dotenv from 'dotenv';
import { DistributionPeriod } from '../src/classes/DistributionPeriod';
import { startNewDistributionPeriod } from '../src/contracts/grant-fund';
import { SdkError } from '../src/types/core';
import { fromWad } from '../src/utils/numeric';
import { initAjna } from './utils';
import { DistributionPeriodStage } from '../src/types/classes';

async function run() {
  dotenv.config();
  const { ajna, signer: signerVoter } = await initAjna('voter');
  const voterAddress: string = signerVoter.address;

  async function delegateVote() {
    const tx = await ajna.grants.delegateVote(signerVoter, voterAddress);
    const rece = await tx.verifyAndSubmit();
    console.log('RECEIPT', rece);
  }

  await delegateVote();

  const delegatee = await ajna.grants.getDelegates(voterAddress);
  console.log('Delegatee is ', delegatee);

  const getDistributionPeriod = async () => {
    let distributionPeriod: DistributionPeriod | undefined;
    distributionPeriod = await ajna.grants.getActiveDistributionPeriod();
    if (distributionPeriod === undefined) {
      const tx = await startNewDistributionPeriod(signerVoter);
      await tx.verifyAndSubmit();
      distributionPeriod = await ajna.grants.getActiveDistributionPeriod();
    }
    return distributionPeriod;
  };

  const distributionPeriodData = await getDistributionPeriod();

  console.log('Distribution period', distributionPeriodData);

  if (distributionPeriodData) {
    const distributionPeriod = await ajna.grants.getDistributionPeriod(distributionPeriodData?.id);

    const screeningVotes = await distributionPeriod.getScreeningVotingPower(voterAddress);

    console.log('Voting power: ', fromWad(screeningVotes));

    const currentVotingPower = await castVotes(distributionPeriod);

    console.log('Current Voting Power: ', currentVotingPower);

    const screeningVotesCastData = await distributionPeriod.getScreeningVotesCast(voterAddress);
    console.log('Screening votes cast: ', screeningVotesCastData);

    const fundingVotesCastData = await distributionPeriod.getFundingVotesCast(voterAddress);
    console.log('Funding votes cast: ', fundingVotesCastData);

    const isDistributionPeriodOnScreeningStage =
      (await distributionPeriod.distributionPeriodStage()) === DistributionPeriodStage.SCREENING;

    if (!isDistributionPeriodOnScreeningStage) {
      const voterInfo = await distributionPeriod.getVoterInfo(delegatee);
      console.log('Voter Info', voterInfo);
    }
  }

  async function castVotes(distributionPeriod: DistributionPeriod) {
    const tx = await distributionPeriod.castVotes(signerVoter, [
      ['0x22bf669502c9c2673093a4ef1dede6c878e1157eb773c221b87db4fed622256e', '1'],
    ]);
    const estimatedGas = await tx.verify();
    console.log(fromWad(estimatedGas), 'estimated gas required for this transaction');
    const recepit = await tx.verifyAndSubmit();
    console.log(recepit);
  }
}

run();
