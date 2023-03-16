import { Contract } from 'ethers';
import { keccak256, toUtf8Bytes } from 'ethers/lib/utils';

/**
 * Error locally raised by SDK.  Does not wrap Ethers.js errors.
 */
export class SdkError extends Error {}

export class ContractError extends Error {
  constructor(contract: Contract, errorData: string) {
    // retrieve the list of custom errors available to the contract
    const customErrorNames = Object.keys(contract.interface.errors);

    // index the contract's errors by the first 8 bytes of their hash
    const errorsByHash = Object.fromEntries(
      customErrorNames.map(name => [keccak256(toUtf8Bytes(name)).substring(0, 10), name])
    );

    if (errorData in errorsByHash) {
      super(errorsByHash[errorData]);
    } else {
      // unexpected
      super(errorData);
    }
  }
}
