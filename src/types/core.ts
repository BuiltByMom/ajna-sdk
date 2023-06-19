import { TransactionReceipt, TransactionResponse } from '@ethersproject/providers';
import { BigNumber, providers, Signer as EthersSigner } from 'ethers';

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
  estimateGasCost(): Promise<BigNumber>;
  submitTransaction(): Promise<TransactionResponse>;
  submit(confirmations?: number): Promise<TransactionReceipt>;
  verifyAndSubmit(confirmations?: number): Promise<TransactionReceipt>;
  verifyAndSubmitResponse(): Promise<TransactionResponse>;
}

export interface CallData {
  methodName: string;
  args?: Array<any>;
}

/**
 * Error intentionally raised by SDK.
 */
export class SdkError extends Error {
  readonly _innerException: any;

  constructor(message: string, innerException?: any) {
    super(message);
    this._innerException = innerException;
  }
}
