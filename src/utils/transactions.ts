import { BaseContract, Contract, PopulatedTransaction } from 'ethers';
import { AllContracts } from '../types/typechain';
import { GAS_MULTIPLIER } from '../constants';
import {
  CallData,
  FunctionEventName,
  TransactionEventDetails,
  TransactionOverrides,
  WrappedTransaction,
  SdkError,
} from '../types';
import { parseNodeError } from './errors';
import { getParsedEvents, getTxEventArgs } from './events';

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
  callData: CallData,
  overrides?: TransactionOverrides
): Promise<WrappedTransaction> {
  const { methodName, args = [] } = callData;
  const argsFiltered = args.filter(a => a !== undefined);

  const params = overrides ? [...argsFiltered, overrides] : [...argsFiltered];

  try {
    const tx = await contract.populateTransaction[methodName](...params);
    return new WrappedTransactionClass(tx, contract);
  } catch (error: any) {
    const reason = parseNodeError(error, contract);
    throw new SdkError(reason, error);
  }
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
      const reason = this.parseNodeError(this._contract, error);
      throw new SdkError(reason, error);
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
  parseNodeError(contract: Contract, error: any) {
    if (error?.error?.error) {
      const innerError = error.error.error;
      // works on mainnet-forked Ganache local testnet
      if (innerError.data?.reason) return innerError.data.reason;
      if (innerError.data?.result) {
        const errorHash = innerError.data.result;
        return this.getCustomErrorFromHash(contract, errorHash);
      }
      // works with Alchemy node on Goerli
      if (innerError.code === 3) {
        // if the hash does not map to a custom error, return the node-provided error
        const errorHash = innerError.data;
        return this.getCustomErrorFromHash(contract, errorHash) ?? error.error.error;
      }
    }
    return 'Revert reason unknown';
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
    const errorsByHash = customErrorNames.reduce((acc: any, name: string) => {
      return {
        ...acc,
        [contract.interface.getSighash(name)]: name,
      };
    }, {});

    errorData = errorData.substring(0, 10);
    if (errorData in errorsByHash) {
      return errorsByHash[errorData];
    } else {
      return undefined;
    }
  }
}

/**
 * Verifies that the transaction can be executed by estimating its gas cost.
 * @returns A Promise that resolves to the estimated gas cost.
 * @throws {@link SdkError} An SDK error if the transaction execution failed and the error reason can be identified.
 * @throws The original error if the transaction execution failed and the error reason cannot be identified.
 */
export async function estimateGasCost(contract: Contract, transaction: PopulatedTransaction) {
  try {
    const estimatedGas = await contract.provider.estimateGas(transaction);
    return estimatedGas;
  } catch (error: unknown) {
    const reason = parseNodeError(error, contract);
    throw new SdkError(reason, error);
  }
}

/**
 * Estimates gas, submits a transaction with gas estimate, and waits for the
 * node to acknowledge the transaction is pending.
 * @throws {@link SdkError} if transaction will fail at current block height.
 * @returns ContractTransaction
 */
export async function estimateGasCostAndSendTx(
  contract: AllContracts,
  methodName: string,
  args: any[] = [],
  overrides?: TransactionOverrides
): Promise<TransactionEventDetails> {
  const populatedTransaction = await contract.populateTransaction[methodName](...args);
  const estimatedGas = await estimateGasCost(contract, populatedTransaction);

  const txOverrides = {
    ...overrides,
    gasLimit: +estimatedGas.mul(GAS_MULTIPLIER),
    from: await contract.signer.getAddress(),
  };

  const tx = await contract.functions[methodName](...args, txOverrides);
  const txReceipt = await tx.wait();

  const eventName = FunctionEventName[methodName as keyof typeof FunctionEventName];
  const parsedEvents = getParsedEvents(txReceipt, contract);
  const eventArgs = getTxEventArgs(txReceipt, contract, eventName);

  const res = {
    transaction: {
      hash: txReceipt.transactionHash,
      receipt: txReceipt,
      methodName,
      args,
      contractName: contract.contractName,
      contractAddress: contract.address,
    },
    event: {
      eventName,
      args: eventArgs,
    },
    allEvents: parsedEvents,
  };

  // console.log(`res:`, res);

  return res;
}
