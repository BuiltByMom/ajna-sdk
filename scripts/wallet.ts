import { AddAccount } from '../src/utils/add-account';
import { wait } from '../src/utils/time';

async function checkWallet() {
  const account = new AddAccount();
  console.log(`\n\n account:\n\n`, account, '\n\n');

  await wait(1000);
  account.addAccountFromKeystore('./secrets.json');

  await wait(5000);
  console.log(`\n\n account:\n\n`, account);

  const wallet = account.getWallet();

  await wait(1000);
  console.log(`\n\n wallet:\n\n`, wallet);
}

checkWallet();
