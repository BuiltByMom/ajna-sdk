#!/usr/bin/env ts-node

import { Wallet } from 'ethers';
import fs from 'fs';
import prettier from 'prettier';
import { password } from '@inquirer/prompts';

async function createNewWallet(keystorePath: string, pw = '') {
  const wallet = Wallet.createRandom();
  console.log('Creating new wallet:', wallet.address);

  if (pw === '') {
    pw = await password({
      message: 'Please enter a password to encrypt your keystore wallet',
      mask: '*',
    });
  }

  const encrypted = await wallet.encrypt(pw);
  const formatted = prettier.format(encrypted, { parser: 'json' });
  fs.writeFileSync(keystorePath, formatted);

  console.log('Wrote keystore wallet to', keystorePath);
  return wallet;
}

async function run() {
  if (process.argv.length >= 3) {
    const pw = await password({
      message: 'Enter a password to encrypt your new keystore wallet',
      mask: '*',
    });

    const [, , keystorePath] = process.argv;
    await createNewWallet(keystorePath, pw);
  } else {
    throw new Error('Please specify path to write keystore file');
  }
}

run();
