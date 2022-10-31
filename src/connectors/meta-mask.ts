/* eslint-disable no-console */
/* eslint-disable @typescript-eslint/no-explicit-any */
import detectEthereumProvider from '@metamask/detect-provider';
import { MetaMaskInpageProvider } from '@metamask/providers';

declare global {
  interface Window {
    ethereum?: MetaMaskInpageProvider;
  }
}

// this returns the provider, or null if it wasn't detected
const getProvider = async () => await detectEthereumProvider();

const provider = getProvider();

if (!provider) {
  console.debug('Please install MetaMask!');
}

let currentAccount: null | undefined = undefined;

// For now, 'eth_accounts' will continue to always return an array
function handleAccountsChanged(accounts: string | any[]) {
  if (accounts.length === 0) {
    // MetaMask is locked or the user has not connected any accounts
    console.debug('Please connect to MetaMask.');
  } else if (accounts[0] !== currentAccount) {
    currentAccount = accounts[0];
    // Do any other work!
  }
}

export const metaMaskEnable = async () => {
  try {
    const response = await (window as any).ethereum.request({
      method: 'eth_requestAccounts'
    });

    handleAccountsChanged(response);
  } catch (err: any) {
    if (err.code === 4001) {
      // EIP-1193 userRejectedRequest error
      // If this happens, the user rejected the connection request.
      console.debug('Please connect to MetaMask.');
    } else {
      console.error(err);
    }
  }
};

export default window.ethereum;
