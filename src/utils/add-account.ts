import { Wallet, providers } from 'ethers';
import fs from 'fs';

const stdout = process.stdout;
const stdin = process.stdin;
let input = '';
const provider = new providers.JsonRpcProvider(
  `https://mainnet.infura.io/v3/${process.env.INFURA_PROJECT_ID}`
);

export const addAccountFromKey = (key: string, provider: providers.Provider) => {
  return new Wallet(key, provider);
};

let jsonKeystore: string;
export const addAccountFromKeystore = (keystorePath: string) => {
  // read the keystore file, confirming it exists
  try {
    jsonKeystore = fs.readFileSync(keystorePath).toString();
  } catch (error) {
    if (!jsonKeystore) {
      console.error(
        `Could not find the jsonKeyStore at the path ${keystorePath}. Please try again.`
      );
      process.exit();
    }
  }

  stdout.write('Enter keystore password: ');
  stdin.setRawMode(true);
  stdin.resume();
  stdin.setEncoding('utf-8');
  stdin.on('data', pwd);
};

export const pwd = (data: any) => {
  const c = data;
  switch (c) {
    case '\u0004': // Ctrl-d
    case '\r':
    case '\n':
      return enter();
    case '\u0003': // Ctrl-c
      return ctrlc();
    default:
      // backspace
      if (c.charCodeAt(0) === 8) return backspace();
      else return newchar(c);
  }
};

function enter() {
  stdin.removeListener('data', pwd);
  stdin.setRawMode(false);
  stdin.pause();
  unlockWallet(input, provider);
}

function ctrlc() {
  stdin.removeListener('data', pwd);
  stdin.setRawMode(false);
  stdin.pause();
}

function newchar(c: string) {
  stdout.write('*'.repeat(c.length));
  input += c;
}

function backspace() {
  input = input.slice(0, input.length - 1);
}

function unlockWallet(input: string, provider: providers.Provider) {
  let wallet = Wallet.fromEncryptedJsonSync(jsonKeystore, input);
  wallet = wallet.connect(provider);
  // console.log('\n\nUnlocked Wallet!\n\n', wallet);
  return wallet;
}

addAccountFromKeystore('./borrow.json');
