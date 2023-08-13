#!/usr/bin/env ts-node

import { BigNumber, Contract, Signer } from 'ethers';
import { fromWad, toWad } from '../src/utils';
import { getAjnaTokenContract } from '../src/contracts/common';
import { initAjna } from './utils';
import { BurnWrapper } from '../src/classes/BurnWrapper';

let ajnaToken: Contract;
let burnWrapper: BurnWrapper;
let signerVoter: Signer;

async function wrapAjna(amount: BigNumber) {
  let tx = await burnWrapper.ajnaApprove(signerVoter, amount);
  await tx.verifyAndSubmit();
  tx = await burnWrapper.wrapAndBurn(signerVoter, amount);
  await tx.verifyAndSubmit();
  console.log('Wrapped', fromWad(amount), 'AJNA');
}

async function run() {
  const { ajna, provider, signer } = await initAjna('voter');
  ajnaToken = getAjnaTokenContract(provider);
  burnWrapper = ajna.burnWrapper;
  signerVoter = signer;
  const voterAddress = await signerVoter.getAddress();

  const ajnaBalance = await ajnaToken.balanceOf(voterAddress);
  console.log('AJNA token balance', fromWad(ajnaBalance));
  const wrappedBalance = await burnWrapper.contract.balanceOf(voterAddress);
  console.log('Wrapped balance   ', fromWad(wrappedBalance));

  const action = process.argv.length > 2 ? process.argv[2] : '';
  if (action === 'wrap') {
    const amount = process.argv.length > 3 ? toWad(process.argv[3]) : ajnaBalance;
    await wrapAjna(amount);
    return;
  }
}

run();
