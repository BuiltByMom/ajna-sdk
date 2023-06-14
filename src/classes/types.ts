/**
 * Error locally raised by SDK.  Does not wrap Ethers.js errors.
 */
export class SdkError extends Error {
  readonly _innerException: any;
  readonly _innerErrorData?: any;

  constructor(message: string, innerException?: any, innerErrorData?: any) {
    super(message);
    this._innerException = innerException;
    this._innerErrorData = innerErrorData;
  }
}
