import { Wallet, providers } from 'ethers';
import fs from 'fs';
import { password } from '@inquirer/prompts';

export const addAccountFromKey = (key: string, provider: providers.Provider) => {
  return new Wallet(key, provider);
};

export const addAccountFromKeystore = async (
  keystorePath: string,
  provider: providers.Provider,
  pw = ''
): Promise<Wallet> => {
  // read the keystore file, confirming it exists
  const jsonKeystore = fs.readFileSync(keystorePath).toString();

  const pswd =
    pw !== ''
      ? pw
      : await password({
          message: 'Please enter your keystore password',
          mask: '*',
        });

  let wallet = Wallet.fromEncryptedJsonSync(jsonKeystore, pswd);
  wallet = wallet.connect(provider);
  return wallet;
};
