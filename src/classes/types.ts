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
