#!/usr/bin/env ts-node

import { AjnaSDK } from '../src/classes/AjnaSDK';
import { Config } from '../src/classes/Config';
import { addAccountFromKeystore } from '../src/utils/add-account';
import { providers } from 'ethers';
import dotenv from 'dotenv';
import { fromWad } from '../src/utils/numeric';
import { Provider, SdkError } from '../src/types';
import { startNewDistributionPeriod } from '../src/contracts/grant-fund';

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

  Config.fromEnvironment();
  const ajna = new AjnaSDK(provider);

  try {
    const distributionPeriod = await ajna.distributionPeriods.getActiveDistributionPeriod();
    console.log('current distribution period details:', distributionPeriod);
  } catch (e) {
    if (
      e instanceof SdkError &&
      e.message === 'There is no active distribution period, starting a new one'
    ) {
      console.log('There is no active distribution period, starting a new one');
      await startDistributionPeriod(provider);
    } else {
      throw e;
    }
  }
}

run();
