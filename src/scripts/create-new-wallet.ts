import { Wallet } from 'ethers';
import fs from 'fs';
import prettier from 'prettier';
import { wait } from '../utils';
import { addAccount } from '../utils/add-account';

export async function createNewWallet(pw: string, path = './secrets.json') {
  const wallet = Wallet.createRandom();

  console.log(`Creating new wallet:`, wallet.address);
  await wait(1000);
  console.log();
  console.log(`encrypting wallet...`);
  console.log();
  await wait(1000);

  let lastTenth = '0';
  const encrypted = await wallet.encrypt(pw, (progress: number) => {
    const sliced = progress.toString().slice(0, 4);
    if (sliced[3] === '0' && sliced[2] !== lastTenth) {
      console.log(`progress:`, `${sliced.slice(2)}%`);
      lastTenth = sliced[2];
    }
  });
  console.log();

  const formatted = prettier.format(encrypted, { parser: 'json' });
  fs.writeFileSync(path, formatted);

  console.log(`Created new wallet:`, path);
  console.log();
  return wallet;
}

export async function run() {
  if (process.argv.length >= 3) {
    // run script using util
    const [, , pw, keyPath] = process.argv;
    // TODO: use commander.js to conceal user inputs
    const wallet = await createNewWallet(pw, keyPath);
    console.log(`wallet:`, wallet);
  } else {
    try {
      const acct = addAccount();
      const wallet = await acct.addAccountFromKeystore();
      if (wallet) {
        console.log(`\n\n wallet:\n\n`, wallet?.getAddress());
      }

      if (!wallet) {
        console.log();
        console.log(`Please try again with syntax: \`yarn acct:add [password] [path.json]\``);
        console.log();
      }
    } catch (error: any) {
      console.error('ERROR:', error);
    }
  }
}

if (process.argv.length > 2) {
  run();
}
