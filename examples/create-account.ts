#!/usr/bin/env ts-node

import { Wallet } from 'ethers';
import fs from 'fs';
import prettier from 'prettier';

async function createNewWallet(keystorePath: string, pw = '') {
  const wallet = Wallet.createRandom();
  console.log('Creating new wallet', wallet.address);

  console.log('with pw', pw);
  const encrypted = await wallet.encrypt(pw);
  const formatted = prettier.format(encrypted, { parser: 'json' });
  fs.writeFileSync(keystorePath, formatted);

  console.log('wrote keystore to', keystorePath);
  return wallet;
}

async function run() {
  if (process.argv.length >= 3) {
    const [, , keystorePath, pw] = process.argv;
    await createNewWallet(keystorePath, pw);
  } else {
    throw new Error('Please specify path to write keystore file and password');
  }
}

run();
