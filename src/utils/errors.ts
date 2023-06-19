import { Contract } from 'ethers';

/**
 * Looks through exception data to find the error hash for various node providers.
 * @param error Error thrown by Ethers in response to an estimateGas failure.
 * @returns string
 */
export function parseNodeError(error: any, contract: Contract | any) {
  let innerError = error;
  if (error?.error) {
    innerError = error.error;
  }
  if (error?.error?.error) {
    innerError = error.error.error;
  }
  // works on mainnet-forked Ganache local testnet
  if (innerError.data?.reason) {
    return innerError.data.reason;
  }
  if (innerError.data?.result) {
    const errorHash = innerError.data.result;
    return getCustomErrorFromHash(errorHash, contract);
  }
  // works with Alchemy node on Goerli
  if (innerError.code === 3) {
    // if the hash does not map to a custom error, return the node-provided error
    const errorHash = innerError.data;
    return getCustomErrorFromHash(errorHash, contract) ?? error.error.error;
  }
  return 'Revert reason unknown';
}

/**
 * Matches error hash from node with custom errors in contract.
 * @param errorData Error hash string parsed from exception raised by node.
 * @param contract Instance of contract with interface prepared from ABI.
 * @returns Human-readable reason explaining why transaction would revert.
 */
export function getCustomErrorFromHash(errorData: string, contract: Contract | any) {
  // retrieve the list of custom errors available to the contract
  const customErrorNames = Object.keys(contract.interface.errors);

  // index the contract's errors by the first 8 bytes of their hash
  const errorsByHash = customErrorNames.reduce((acc: any, name: string) => {
    return {
      ...acc,
      [contract.interface.getSighash(name)]: name,
    };
  }, {});

  const errorSigHash = errorData.substring(0, 10);
  if (errorSigHash in errorsByHash) {
    return errorsByHash[errorSigHash];
  } else {
    return undefined;
  }
}
