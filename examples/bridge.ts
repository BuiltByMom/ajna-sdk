#!/usr/bin/env ts-node

import { BigNumber, providers } from 'ethers';
import { AjnaSDK } from '../src/classes/AjnaSDK';
import { Config } from '../src/classes/Config';
import { addAccountFromKey, addAccountFromKeystore } from '../src/utils/add-account';
import { fromWad, toWad } from '../src/utils';
import { getAjnaTokenContract } from '../src/contracts/common';

// Configure from environment
const provider = new providers.JsonRpcProvider(process.env.ETH_RPC_URL);
const signerVoter = process.env.VOTER_KEY
  ? addAccountFromKey(process.env.VOTER_KEY || '', provider)
  : addAccountFromKeystore(
      process.env.VOTER_KEYSTORE || '',
      provider,
      process.env.VOTER_PASSWORD || ''
    );

Config.fromEnvironment();
const ajna = new AjnaSDK(provider);
const ajnaToken = getAjnaTokenContract(provider);
const burnWrapper = ajna.burnWrapper;

async function wrapAjna(amount: BigNumber) {
  let tx = await burnWrapper.ajnaApprove(signerVoter, amount);
  await tx.verifyAndSubmit();
  tx = await burnWrapper.wrapAndBurn(signerVoter, amount);
  await tx.verifyAndSubmit();
  console.log('Wrapped', fromWad(amount), 'AJNA');
}

async function run() {
  const ajnaBalance = await ajnaToken.balanceOf(signerVoter.address);
  console.log('AJNA token balance', fromWad(ajnaBalance));
  const wrappedBalance = await burnWrapper.contract.balanceOf(signerVoter.address);
  console.log('Wrapped balance   ', fromWad(wrappedBalance));

  const action = process.argv.length > 2 ? process.argv[2] : '';
  if (action === 'wrap') {
    const amount = process.argv.length > 3 ? toWad(process.argv[3]) : ajnaBalance;
    await wrapAjna(amount);
    return;
  }
}

run();
