import { useContext } from 'react';
import { Web3Context, Web3ContextProps } from '../contexts/wallet';

const useWallet = (): Web3ContextProps => {
  return useContext(Web3Context);
};

export default useWallet;
