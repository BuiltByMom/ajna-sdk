import { Wallet, providers } from 'ethers';

const addAccount = (key: string, provider: providers.Provider) => {
  return new Wallet(key, provider);
};

export default addAccount;
