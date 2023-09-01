import { Result } from '@ethersproject/abi';
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
  verify(): Promise<BigNumber>;
  submit(confirmations?: number): Promise<TransactionReceipt>;
  submitResponse(): Promise<TransactionResponse>;
  verifyAndSubmit(confirmations?: number): Promise<TransactionReceipt>;
  verifyAndSubmitResponse(): Promise<TransactionResponse>;
  getEventLogs(receipt: TransactionReceipt): Map<string, Array<EventLog>>;
}

export interface CallData {
  methodName: string;
  args?: Array<any>;
}

export interface EventLog {
  eventName: string;
  args: Result;
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
