import dotenv from 'dotenv';
import { Config } from '../constants';
import { BaseContract, providers } from 'ethers';
import { getGrantsFundContract } from '../contracts/grant-fund';

/**
 * Iterate through each contract, decoding error hashes.
 * Ensure environment is configured (to any chain) before running.
 */
export const decodeErrors = function () {
  dotenv.config();
  const provider = new providers.JsonRpcProvider(process.env.ETH_RPC_URL);
  // TODO: load interface directly from ABI so we don't need a provider
  Config.fromEnvironment();

  // TODO: decode errors from other contracts, label them in stdout
  getCustomErrorsFromContract(getGrantsFundContract(provider));
};

/**
 * print error hashes for a single contract
 * @param contract identifies the contract for which error hashes are desired
 */
export function getCustomErrorsFromContract(contract: BaseContract) {
  // retrieve the list of custom errors available to the contract
  const customErrorNames = Object.keys(contract.interface.errors);

  // index the contract's errors by the first 8 bytes of their hash
  const errorsByHash = customErrorNames.reduce((acc: any, name: string) => {
    return {
      ...acc,
      [contract.interface.getSighash(name)]: name,
    };
  }, {});

  for (const errorHash in errorsByHash) {
    // TODO: format into table or CSV
    console.log(errorsByHash[errorHash], errorHash);
  }
}
