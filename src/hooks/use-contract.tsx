import { useEffect, useState } from 'react';
import contractJsonAbi from '../abi/ERC20Pool.json';
import { CONTRACT } from '../constants/config';
import { ContractType } from '../constants/interfaces';
import useWallet from './use-wallet';

const useContract = () => {
  const { web3, address } = useWallet();
  const [contract, setContract] = useState<ContractType | null>(null);

  useEffect(() => {
    if (web3 && address && !contract) {
      const newContract = new web3.eth.Contract(contractJsonAbi, CONTRACT);
      setContract(newContract);
    }
  }, [address, contract, web3]);

  return {
    contract
  };
};

export default useContract;
