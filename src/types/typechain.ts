import { BigNumber, PopulatedTransaction } from 'ethers';
import { ERC20, ERC20Pool, ERC721, ERC721Pool } from './contracts';

export interface CustomContractTypes {
  [key: string]: any;
  estimateGas: {
    [key: string]: (...args: any[]) => Promise<BigNumber>;
  };
  populateTransaction: {
    [key: string]: (...args: any[]) => Promise<PopulatedTransaction>;
  };
  callStatic: {
    [key: string]: (...args: any[]) => Promise<any>;
  };
  functions: {
    [key: string]: (...args: any[]) => Promise<any>;
  };
  contractName: string;
}

export type TokenContract = (ERC20 | ERC721) & CustomContractTypes;
export type ErcPool = (ERC20Pool | ERC721Pool) & CustomContractTypes;
