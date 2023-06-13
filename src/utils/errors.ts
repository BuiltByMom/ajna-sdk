import { getErc20PoolInterface } from '../contracts/erc20-pool';
// import { Interface } from 'ethersv6';
/**
 * Error locally raised by SDK.  Does not wrap Ethers.js errors.
 */
export class SdkError extends Error {
  readonly _innerException: any;

  constructor(message: string, innerException?: any) {
    super(message);
    this._innerException = innerException;
  }
}

export async function handleProviderError(error: any) {
  if (error?.error && error.error.code === '-32000') {
    // https://docs.alchemy.com/reference/error-reference#json-rpc-error-codes
    // This generally means the transaction already posted and is on the node in a pending state.
    // Sometimes this error occurs when transactions fail at first but are retried when the node already knows of them
    throw new SdkError(
      'This generally means the transaction already posted and is on the node in a pending state',
      error
    );
  }

  console.log(`error:`, error);

  // const iFace = new Interface(getErc20PoolInterface().fragments);
  // const decodedErrorResult = iFace.decodeErrorResult('deployPool', error);
  // console.log(`decodedErrorResult:`, decodedErrorResult);

  throw new SdkError(error.message, error);
}
