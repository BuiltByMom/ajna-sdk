import { wait } from '../utils';
import { AddAccount } from '../utils/add-account';

export async function checkWallet(path = './secrets.json') {
  const account = new AddAccount();
  await wait(1000);

  await account.addAccountFromKeystore(path);
  await wait(3000);

  const wallet = account.getWallet();
  await wait(1000);

  if (wallet) {
    console.log(`\n\n wallet:\n\n`, wallet?.getAddress());
  }
}

// run script
const [, , keyPath] = process.argv;
if (process.argv.length > 2) {
  checkWallet(keyPath);
}
