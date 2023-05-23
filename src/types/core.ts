import { TransactionReceipt, TransactionResponse } from '@ethersproject/providers';
import { BigNumber, providers, Signer as EthersSigner, ContractTransaction } from 'ethers';

export type Signer = EthersSigner;

export type SignerOrProvider = Signer | providers.Provider;

export type Provider = providers.Provider;

export type Address = string;

export type CollateralAddress = Address;

export type QuoteAddress = Address;

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
  args?: Array<any>;
  [propName: string]: any;
}
