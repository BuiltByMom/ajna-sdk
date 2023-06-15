import { ALL_CONTRACTS } from '../types';
import { getErc20PoolFactoryInterface } from '../contracts';

export function getCustomError(contract: ALL_CONTRACTS, errorDataResult: string) {
  // retrieve the list of custom errors available to the contract
  const customErrorNames = Object.keys(contract.interface.errors);

  // index the contract's errors by the first 8 bytes of their hash
  const errorsByHash = customErrorNames.reduce((acc: any, name: string) => {
    return {
      ...acc,
      [contract.interface.getSighash(name)]: name,
    };
  }, {});

  // Get the first 8 bytes of the error hash
  const errorSigHash = errorDataResult.slice(0, 10);

  if (errorSigHash in errorsByHash) {
    return errorsByHash[errorSigHash];
  } else {
    return undefined;
  }
}

export function parseSdkError(contract: ALL_CONTRACTS, error: any) {
  const iFace = getErc20PoolFactoryInterface();
  return iFace.parseError(error._innerException.error.data.result);
}
