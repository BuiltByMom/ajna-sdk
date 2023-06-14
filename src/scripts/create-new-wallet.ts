#!/usr/bin/env ts-node

import { Wallet } from 'ethers';
import fs from 'fs';
import prettier from 'prettier';
import { spaceLog } from './helpers';

export async function createNewWallet(pw: string, path: string) {
  const wallet = Wallet.createRandom();

  spaceLog('Creating new wallet:', wallet.address);
  spaceLog(`Encrypting wallet...`);

  let lastTenth = '0';
  const encrypted = await wallet.encrypt(pw, (progress: number) => {
    const sliced = progress.toString().slice(0, 4);
    if (sliced[3] === '0' && sliced[2] !== lastTenth) {
      console.log(`Progress:`, `${sliced.slice(2)}%`);
      lastTenth = sliced[2];
    }
  });

  const formatted = prettier.format(encrypted, { parser: 'json' });
  fs.writeFileSync(path, formatted);

  spaceLog(`Created new wallet:`, path);
  return wallet;
}

export async function run() {
  // run script using util
  const [, , pw, keyPath] = process.argv;
  if (!keyPath.endsWith('.json')) {
    spaceLog(`Please provide a path with a .json extension`);
    process.exit();
  }

  const wallet = await createNewWallet(pw, keyPath);
  spaceLog(`wallet:`, wallet);
}

if (process.argv.length === 4) {
  run();
} else {
  spaceLog(
    `Please try again with syntax: \`ts-node ./src/scripts/create-new-wallet.ts [password] [path.json]\``
  );
}
