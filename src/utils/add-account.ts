import { Wallet, providers } from 'ethers';
import fs from 'fs';

export const addAccountFromKey = (key: string, provider: providers.Provider) => {
  return new Wallet(key, provider);
};

export const addAccountFromKeystore = (keystorePath: string, provider: providers.Provider) => {
  // read the keystore file, confirming it exists
  const jsonKeystore = fs.readFileSync(keystorePath).toString();

  const pswd = prompt('Enter keystore password: ');
  let wallet = Wallet.fromEncryptedJsonSync(jsonKeystore, pswd);
  wallet = wallet.connect(provider);
  return wallet;
};

// TODO: prevent echoing password to stdout
const prompt = (msg: string) => {
  fs.writeSync(1, msg);
  let s = '';
  const stdin = fs.openSync('/dev/stdin', 'rs');
  const buf = Buffer.alloc(1);
  while (buf[0] - 10 && buf[0] - 13) {
    s += buf;
    fs.readSync(stdin, buf, 0, 1, null);
  }
  return s.slice(1);
};
