/* eslint-disable no-console */
/* eslint-disable @typescript-eslint/ban-ts-comment */
import { createContext, ReactNode, useEffect, useState } from 'react';
import Web3 from 'web3';
import { provider } from 'web3-core';
import metaMask, { enable as metaMaskEnable } from '../connectors/meta-mask';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Web3Type = any;

type ProviderType = provider & {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  on: (eventName: string, cb: (param: any, param2?: any) => void) => void;
};

interface WalletProviderProps {
  children: ReactNode;
}

export interface Web3ContextProps {
  web3: Web3Type;
  provider?: ProviderType;
  chainId: number;
  networkId: number;
  connect: (connectorType: string) => Promise<void>;
  disconnect: () => Promise<void>;
  balance: number;
  isFetching?: boolean;
  isConnected: boolean;
  address: string;
}

export const Web3Context = createContext<Web3ContextProps>(
  {} as Web3ContextProps
);

const WalletProvider = ({ children }: WalletProviderProps) => {
  const [web3, setWeb3] = useState<Web3Type>(undefined);
  const [currentProvider, setCurrentProvider] = useState<ProviderType>();
  const [address, setAddress] = useState<string>('');
  const [balance, setBalance] = useState<number>(0);
  const [chainId, setChainId] = useState(56);
  const [networkId, setNetworkId] = useState(0);
  const [isFetching, setIsFetching] = useState(false);
  const [isConnected, setIsConnected] = useState(false);

  const initWeb3 = (provider: ProviderType) => {
    setCurrentProvider(provider);
    const library: Web3Type = new Web3(provider);

    library.eth.extend({
      methods: [
        {
          name: 'chainId',
          call: 'eth_chainId',
          outputFormatter: library.utils.hexToNumber
        }
      ]
    });

    return library;
  };

  const connect = async (provider: ProviderType) => {
    const web3 = initWeb3(provider);
    setWeb3(web3);

    setIsFetching(true);
    setListeners();

    const accounts = await web3.eth.getAccounts();
    const networkId = await web3.eth.net.getId();
    const chainId = await web3.eth.chainId();

    const balance = await getBalance(accounts[0], web3);

    setIsConnected(true);
    setAddress(accounts[0]);
    setChainId(chainId);
    setNetworkId(networkId);
    setBalance(balance);
    setIsFetching(false);
  };

  const disconnect = async () => {
    setIsConnected(false);
    setAddress('');
    setNetworkId(0);
    setIsFetching(false);
  };

  const getBalance = async (address: string, web3Param?: Web3Type) => {
    let web3Local = web3;

    if (!address || (!web3 && !web3Param)) {
      return NaN;
    }

    if (web3Param) {
      web3Local = web3Param;
    }

    const balanceBigNumber = await web3Local.eth.getBalance(address);

    return web3Local.utils.fromWei(balanceBigNumber, 'ether');
  };

  const updateBalance = async (address: string) => {
    const balance = await getBalance(address);
    setBalance(balance);
  };

  const onClickConnectHandler = async (connectorType: string) => {
    const connector = connectorType === 'metaMask' ? metaMask : '';

    if (connectorType === 'metaMask') {
      await metaMaskEnable();
    } else {
      // else
    }

    try {
      await connect(connector as ProviderType);
    } catch (ex) {
      console.debug('onClickConnectHandler', ex);
    }
  };

  const setListeners = () => {
    // Subscribe to accounts change
    currentProvider?.on('accountsChanged', (accounts: string[]) => {
      console.debug('accountsChanged', accounts);

      // Intercept manual disconnection of metamask
      if (!accounts.length) {
        disconnect();
      }
    });

    // Subscribe to chainId change
    currentProvider?.on('chainChanged', (chainId: number) => {
      console.debug('chainChanged', chainId);
      // We recommend reloading the page, unless you must do otherwise
      window.location.reload();
    });

    // Subscribe to session disconnection
    currentProvider?.on('disconnect', (code: number, reason: string) => {
      console.debug('disconnect', code, reason);
    });
  };

  useEffect(() => {
    updateBalance(address);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [address]);

  return (
    <Web3Context.Provider
      value={{
        web3,
        provider: currentProvider,
        address,
        balance,
        networkId,
        chainId,
        isFetching,
        isConnected,
        connect: onClickConnectHandler,
        disconnect
      }}
    >
      {children}
    </Web3Context.Provider>
  );
};

export default WalletProvider;
