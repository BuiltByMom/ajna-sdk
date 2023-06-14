#!/usr/bin/env ts-node

import { AjnaSDK } from '../src/classes/AjnaSDK';
import { Config } from '../src/classes/Config';
import { addAccountFromKeystore } from '../src/utils/add-account';
import { providers } from 'ethers';
import dotenv from 'dotenv';

async function run() {
  dotenv.config();
  // Configure from environment
  const provider = new providers.JsonRpcProvider(process.env.ETH_RPC_URL);
  // Use this for local testnets, where JSON keystores are unavailable.
  // const voter = addAccountFromKey(process.env.ETH_KEY || '', provider);
  // Use this for a real chain, such as Goerli or Mainnet.
  const voter = addAccountFromKeystore(
    process.env.VOTER_KEYSTORE || '',
    provider,
    process.env.VOTER_PASSWORD
  );
  const delegateeAddress: string = process.env.VOTER_KEYSTORE ?? '';

  Config.fromEnvironment();
  const ajna = new AjnaSDK(provider);

  async function delegateVote() {
    const tx = await ajna.grants.delegateVote(voter, delegateeAddress);
    await tx.verifyAndSubmit();
  }

  await delegateVote();
  console.log('voted delegated to delegatee ', delegateeAddress);
}

run();
