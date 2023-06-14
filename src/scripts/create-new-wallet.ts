import { Wallet } from 'ethers';
import fs from 'fs';
import prettier from 'prettier';
import { addAccount } from '../utils/add-account';
import { EOL } from 'os';

export async function createNewWallet(pw: string, path = './secrets.json') {
  const wallet = Wallet.createRandom();

  console.log(EOL, `Creating new wallet:`, wallet.address);
  console.log(EOL, `Encrypting wallet...`, EOL);

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

  console.log(EOL, `Created new wallet:`, path, EOL);
  return wallet;
}

export async function run() {
  if (process.argv.length >= 3) {
    // run script using util
    const [, , pw, keyPath] = process.argv;
    // TODO: use commander.js to conceal user inputs
    const wallet = await createNewWallet(pw, keyPath);
    console.log(`wallet:`, wallet, EOL);
  } else {
    try {
      const acct = addAccount();
      const wallet = await acct.addAccountFromKeystore();
      if (wallet) {
        console.log(EOL, `wallet:`, wallet?.getAddress(), EOL);
      }

      if (!wallet) {
        console.log(`Please try again with syntax: \`yarn acct:add [password] [path.json]\``, EOL);
      }
    } catch (error: any) {
      console.error('ERROR:', error);
    }
  }
}

if (process.argv.length > 2) {
  run();
}
