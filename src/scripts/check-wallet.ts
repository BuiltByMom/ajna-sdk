import { AddAccount } from '../utils/add-account';
import { spaceLog } from './helpers';

export async function checkWallet(path: string) {
  const account = new AddAccount();
  await account.addAccountFromKeystore(path);
  const wallet = account.getWallet();

  if (wallet) {
    spaceLog(`wallet:`, wallet?.getAddress());
  }
}

// run script
const [, , keyPath] = process.argv;
if (process.argv.length > 2) {
  checkWallet(keyPath);
}
