import Web3 from 'web3';

const addAccount = (web3: Web3, key: string) => {
  const signer = web3.eth.accounts.privateKeyToAccount(key);

  web3.eth.accounts.wallet.add(signer);

  return signer;
};

export default addAccount;
