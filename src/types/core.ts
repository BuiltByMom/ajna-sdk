import { TransactionReceipt, TransactionResponse } from '@ethersproject/providers';
import { BigNumber, providers, Signer, ContractTransaction } from 'ethers';

export type Provider = providers.Provider;

export type SignerOrProvider = Signer | Provider;

export type Address = string;

export interface TransactionOverrides {
  to?: string;
  from?: string;
  value?: string;
  gasLimit?: number;
  gasPrice?: string;
  nonce?: string;
}

export interface WrappedTransaction {
  verify(): Promise<BigNumber>;
  submit(confirmations?: number): Promise<TransactionReceipt>;
  submitResponse(): Promise<TransactionResponse>;
  verifyAndSubmit(confirmations?: number): Promise<TransactionReceipt>;
  verifyAndSubmitResponse(): Promise<ContractTransaction>;
}

export interface CallData {
  methodName: string;
  args: Array<any>;
  [propName: string]: any;
}

export enum TokenContract {
  ERC20 = 'ERC20',
  ERC721 = 'ERC721',
}

export enum PoolContracts {
  ERC20Pool = 'ERC20Pool',
  ERC721Pool = 'ERC721Pool',
  ERC20PoolFactory = 'ERC20PoolFactory',
  ERC721PoolFactory = 'ERC721PoolFactory',
}

export interface ContractFunction {
  [key: string]: any;
}
