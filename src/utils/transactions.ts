import { SdkError } from '../classes/types';
import { GAS_MULTIPLIER } from '../constants';
import { TransactionOverrides, WrappedTransaction } from '../types';
import { BaseContract, Contract, PopulatedTransaction } from 'ethers';
import { keccak256, toUtf8Bytes } from 'ethers/lib/utils';

/**
 * Creates a wrapped transaction object that can be used to submit, verify, and estimate gas for a transaction.
 * @param contract The ethers.js contract instance.
 * @param methodName The name of the method to call on the contract.
 * @param args An array of arguments to pass to the method.
 * @param overrides An optional object with transaction overrides, such as gasPrice and gasLimit.
 * @returns The wrapped transaction object.
 */
export async function createTransaction(
  contract: Contract,
  methodName: string,
  args: Array<any>,
  overrides?: TransactionOverrides
): Promise<WrappedTransaction> {
  const tx = await contract.populateTransaction[methodName](
    ...(overrides ? [...args, overrides] : [...args])
  );
  return new WrappedTransactionClass(tx, contract);
}

/**
 * A class representing a wrapped transaction that can be used to submit, verify, and estimate gas for a transaction.
 */
class WrappedTransactionClass implements WrappedTransaction {
  /**
   * The populated transaction object.
   */
  readonly _transaction: PopulatedTransaction;
  /**
   * The ethers.js contract instance.
   */
  readonly _contract: BaseContract;

  /**
   * Creates a new wrapped transaction instance.
   * @param transaction The populated transaction object.
   * @param contract The ethers.js contract instance.
   */
  constructor(transaction: PopulatedTransaction, contract: BaseContract) {
    this._transaction = transaction;
    this._contract = contract;
  }

  /**
   * Verifies that the transaction can be executed by estimating its gas cost.
   * @returns A Promise that resolves to the estimated gas cost.
   * @throws {@link SdkError} An SDK error if the transaction execution failed and the error reason can be identified.
   * @throws The original error if the transaction execution failed and the error reason cannot be identified.
   */
  async verify() {
    try {
      return await this._contract.provider.estimateGas(this._transaction);
    } catch (error: unknown) {
      const errorHash = this.parseCustomErrorHashFromNodeError(error);
      if (errorHash !== null) {
        const reason = this.getCustomErrorFromHash(this._contract, errorHash);
        throw new SdkError(reason, error);
      } else {
        throw error;
      }
    }
  }

  /**
   * Submits the transaction to the blockchain using the signer.
   * @returns The transaction receipt.
   */
  async submitResponse() {
    return await this._contract.signer.sendTransaction(this._transaction);
  }

  /**
   * Submits the transaction to the blockchain and waits for it to be mined.
   * @param confirmations The number of confirmations to wait for (default is 1).
   * @returns A Promise that resolves to the transaction receipt.
   */
  async submit(confirmations?: number) {
    const response = await this.submitResponse();
    return await response.wait(confirmations);
  }

  /**
   * Estimates gas, submits a transaction with gas estimate, and waits for the
   * node to acknowledge the transaction is pending.
   * @throws {@link SdkError} if transaction will fail at current block height.
   * @returns TransactionResponse
   */
  async verifyAndSubmitResponse() {
    const estimatedGas = await this.verify();
    const txWithAdjustedGas = {
      ...this._transaction,
      gasLimit: +estimatedGas.mul(GAS_MULTIPLIER),
    };
    return await this._contract.signer.sendTransaction(txWithAdjustedGas);
  }

  /**
   * Estimates gas, submits a transaction with gas estimate, and waits for the transaction to be
   * included in a block.
   * @param confirmations Optionally wait for specific number of confirmations.
   * @throws {@link SdkError} if transaction will fail at current block height.
   * @returns TransactionReceipt
   */
  async verifyAndSubmit(confirmations?: number) {
    const response = await this.verifyAndSubmitResponse();
    return await response.wait(confirmations);
  }

  /**
   * Looks through exception data to find the error hash for various node providers.
   * @param error Error thrown by Ethers in response to an estimateGas failure.
   * @returns string
   */
  parseCustomErrorHashFromNodeError(error: any) {
    if (
      // works with Alchemy node on Goerli
      'error' in error && // estimateGas error
      'error' in error.error && // response error
      'code' in error.error.error && // execution revert error
      error.error.error.code == 3 // indicates execution reverted
    ) {
      return error.error.error.data;
    } else if (
      // works on mainnet-forked Ganache local testnet
      'error' in error && // estimateGas error
      'error' in error.error && // server error
      'data' in error.error.error && // execution revert error
      'result' in error.error.error.data // error hash
    ) {
      return error.error.error.data.result;
    }
    return null;
  }

  /**
   * Matches error hash from node with custom errors in contract.
   * @param contract Instance of contract with interface prepared from ABI.
   * @param errorData Error hash string parsed from exception raised by node.
   * @returns Human-readable reason explaining why transaction would revert.
   */
  getCustomErrorFromHash(contract: Contract, errorData: string) {
    // retrieve the list of custom errors available to the contract
    const customErrorNames = Object.keys(contract.interface.errors);

    // index the contract's errors by the first 8 bytes of their hash
    const errorsByHash = Object.fromEntries(
      customErrorNames.map(name => [keccak256(toUtf8Bytes(name)).substring(0, 10), name])
    );

    if (errorData in errorsByHash) {
      return errorsByHash[errorData];
    } else {
      // unexpected
      return 'Custom error not found for hash ' + errorData;
    }
  }
}
