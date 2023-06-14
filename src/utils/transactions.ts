import {
  CallData,
  WrappedTransaction,
  POOL_CONTRACT,
  ALL_CONTRACTS,
  MANAGER_CONTRACT,
  CustomContractTypes,
  TransactionOverrides,
} from '../types';
import { BigNumber, PopulatedTransaction, ContractReceipt, ContractTransaction } from 'ethers';
import { GAS_MULTIPLIER } from '../constants';
import { Pool } from '../classes/Pool';
import { SdkError } from '../classes/types';
import { getNamedContract, getPoolContract } from './helpers';
import { getCustomErrorMessage } from './errors';

/**
 * Creates a wrapped transaction object that can be used to submit, verify, and estimate gas for a transaction.
 * @param contract The ethers.js contract instance.
 * @param methodName The name of the method to call on the contract.
 * @param args An array of arguments to pass to the method.
 * @param overrides An optional object with transaction overrides, such as gasPrice and gasLimit.
 * @returns The wrapped transaction object.
 */
export async function createTransaction(
  contract: ALL_CONTRACTS & CustomContractTypes,
  callData: CallData,
  overrides?: TransactionOverrides
): Promise<WrappedTransactionClass> {
  const { methodName, args = [] } = callData;
  const definedArgs = args.filter(a => a !== undefined);

  const txArgs = overrides ? [...definedArgs, overrides] : [...definedArgs];
  const populatedTx = await contract.populateTransaction[methodName](...txArgs);

  const namedContract = contract.contractName?.includes('Pool')
    ? (getPoolContract(contract as POOL_CONTRACT) as POOL_CONTRACT)
    : contract.contractName?.includes('Manager')
    ? getNamedContract(contract as MANAGER_CONTRACT)
    : getNamedContract(contract as ALL_CONTRACTS);

  return new WrappedTransactionClass(populatedTx, namedContract, methodName, txArgs);
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
  readonly _contract: ALL_CONTRACTS & CustomContractTypes;
  readonly _methodName: string;
  readonly _txArgs: any[];

  /**
   * Creates a new wrapped transaction instance.
   * @param transaction The populated transaction object.
   * @param contract The ethers.js contract instance.
   */
  constructor(
    transaction: PopulatedTransaction,
    contract: ALL_CONTRACTS & CustomContractTypes,
    methodName: string,
    txArgs: any[]
  ) {
    this._transaction = transaction;
    this._contract = contract;
    this._methodName = methodName;
    this._txArgs = txArgs;
  }

  /**
   * Verifies that the transaction can be executed by estimating its gas cost.
   * @returns A Promise that resolves to the estimated gas cost.
   * @throws {@link SdkError} An SDK error if the transaction execution failed and the error reason can be identified.
   * @throws The original error if the transaction execution failed and the error reason cannot be identified.
   */
  async verify(): Promise<BigNumber> {
    try {
      return await this._contract.estimateGas[this._methodName](...this._txArgs);
    } catch (error: any) {
      const parsed = this.parseNodeError(this._contract, error);
      throw new SdkError(parsed.message, error.error, parsed._innerErrorData);
    }
  }

  /**
   * Submits the transaction to the blockchain using the signer.
   * @returns The contract transaction.
   */
  async submitResponse(): Promise<ContractTransaction> {
    return await this._contract.functions[this._methodName](...this._txArgs);
  }

  /**
   * Submits the transaction to the blockchain and waits for it to be mined.
   * @param confirmations The number of confirmations to wait for (default is 1).
   * @returns A Promise that resolves to the contract transaction receipt.
   */
  async submit(confirmations?: number): Promise<ContractReceipt> {
    const response = await this.submitResponse();
    return await response.wait(confirmations);
  }

  /**
   * Estimates gas, submits a transaction with gas estimate, and waits for the
   * node to acknowledge the transaction is pending.
   * @throws {@link SdkError} if transaction will fail at current block height.
   * @returns ContractTransaction
   */
  async verifyAndSubmitResponse(): Promise<ContractTransaction> {
    const estimatedGas = await this.verify();
    return await this._contract[this._methodName](...this._txArgs, {
      gasLimit: +estimatedGas.mul(GAS_MULTIPLIER),
    });
  }

  /**
   * Estimates gas, submits a transaction with gas estimate, and waits for the transaction to be
   * included in a block.
   * @param confirmations Optionally wait for specific number of confirmations.
   * @throws {@link SdkError} if transaction will fail at current block height.
   * @returns TransactionReceipt
   */
  async verifyAndSubmit(confirmations?: number) {
    const tx = await this.verifyAndSubmitResponse();
    return await tx.wait(confirmations);
  }

  /**
   * Looks through exception data to find the error hash for various node providers.
   * @param error Error thrown by Ethers in response to an estimateGas failure.
   * @returns string
   */
  parseNodeError(contract: ALL_CONTRACTS, error: any) {
    if (error?.error?.error) {
      const innerError = error.error.error;
      // works on mainnet-forked Ganache local testnet
      // if (innerError.data?.reason) return innerError.data.reason;
      if (innerError.data?.result) {
        const errorDataResult = innerError.data.result;
        return this.getCustomErrorFromHash(contract, errorDataResult);
      }
      // works with Alchemy node on Goerli
      if (innerError.code === 3) {
        // if the hash does not map to a custom error, return the node-provided error
        const errorHash = innerError.data;
        return this.getCustomErrorFromHash(contract, errorHash) ?? error.error.error;
      }
    }
    return { message: 'Revert reason unknown', _innerErrorData: undefined };
  }

  /**
   * Matches error hash from node with custom errors in contract.
   * @param contract Instance of contract with interface prepared from ABI.
   * @param errorData Error hash string parsed from exception raised by node.
   * @returns Human-readable reason explaining why transaction would revert.
   */
  getCustomErrorFromHash(contract: ALL_CONTRACTS, errorDataResult: string) {
    // if the error data contains an address, return it
    let errorDataResultAddress;
    if (errorDataResult.length > 10) {
      errorDataResultAddress = `0x${errorDataResult.slice(-40)}`;
    }
    return {
      message: getCustomErrorMessage(contract, errorDataResult),
      _innerErrorData: errorDataResultAddress,
    };
  }
}

export { WrappedTransactionClass };
