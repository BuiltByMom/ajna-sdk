import { keccak256, toUtf8Bytes } from 'ethers/lib/utils';
import {
  CallData,
  WrappedTransaction,
  TOKEN_POOL_CONTRACT,
  POOL_CONTRACT,
  ALL_CONTRACTS,
  MANAGER_CONTRACT,
} from '../types';
import {
  BigNumber,
  PopulatedTransaction,
  Overrides,
  ContractTransaction,
  ContractReceipt,
} from 'ethers';
import { GAS_MULTIPLIER } from '../constants';
import { Pool } from '../classes/Pool';
import { SdkError } from '../classes/types';
import { getNamedContract, getPoolContract } from './helpers';

/**
 * Creates a wrapped transaction object that can be used to submit, verify, and estimate gas for a transaction.
 * @param contract The ethers.js contract instance.
 * @param methodName The name of the method to call on the contract.
 * @param args An array of arguments to pass to the method.
 * @param overrides An optional object with transaction overrides, such as gasPrice and gasLimit.
 * @returns The wrapped transaction object.
 */
export async function createTransaction(
  contract: ALL_CONTRACTS,
  callData: CallData,
  overrides?: Overrides
): Promise<WrappedTransactionClass> {
  const { methodName, args = [] } = callData;
  const definedArgs = args.filter(a => a !== undefined);

  const txArgs = overrides ? [...definedArgs, overrides] : [...definedArgs];
  const populatedTx = (contract.populateTransaction as any)[methodName](
    ...txArgs
  ) as PopulatedTransaction;

  const namedContract = contract.contractName.includes('Pool')
    ? getPoolContract(contract as POOL_CONTRACT)
    : contract.contractName.includes('Manager')
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
  _contract: ALL_CONTRACTS;
  readonly _methodName: string;
  readonly _txArgs: any[];

  /**
   * Creates a new wrapped transaction instance.
   * @param transaction The populated transaction object.
   * @param contract The ethers.js contract instance.
   */
  constructor(
    transaction: PopulatedTransaction,
    contract: ALL_CONTRACTS,
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
      return await this._contract.provider.estimateGas(this._transaction);
      // // @ts-ignore
      // const gasEstimate: BigNumber = await this._contract.estimateGas[this._methodName][
      //   this._txArgs
      // ];
      // console.log(`gasEstimate:`, gasEstimate);
      // if (!gasEstimate) {
      //   throw new SdkError('Gas estimate is undefined');
      // }
      // return gasEstimate;
    } catch (error: any) {
      const reason = this.parseNodeError(this._contract, error);
      throw new SdkError(reason, error);
    }
  }

  /**
   * Submits the transaction to the blockchain using the signer.
   * @returns The contract transaction.
   */
  async submitResponse(): Promise<ContractTransaction> {
    // @ts-ignore
    return this._contract[this._methodName](...this._txArgs);
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
  async submitAndVerifyTransaction(): Promise<ContractTransaction> {
    const estimatedGas = await this.verify();
    const txWithAdjustedGas = {
      ...this._transaction,
      gasLimit: +estimatedGas.mul(GAS_MULTIPLIER),
    };
    // @ts-ignore
    const tx: ContractTransaction = await this._contract[this._methodName](
      ...this._txArgs,
      txWithAdjustedGas
    );
    console.log(`tx:`, tx);
    return tx;
  }

  /**
   * Estimates gas, submits a transaction with gas estimate, and waits for the transaction to be
   * included in a block.
   * @param confirmations Optionally wait for specific number of confirmations.
   * @throws {@link SdkError} if transaction will fail at current block height.
   * @returns TransactionReceipt
   */
  async verifyAndSubmit(confirmations?: number) {
    const tx = await this.submitAndVerifyTransaction();
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
  getCustomErrorFromHash(contract: ALL_CONTRACTS, errorData: string) {
    // retrieve the list of custom errors available to the contract
    const customErrorNames = Object.keys(contract.interface.errors);

    // index the contract's errors by the first 8 bytes of their hash
    const errorsByHash = customErrorNames.reduce((acc: any, name: string) => {
      return {
        ...acc,
        [contract.interface.getSighash(name)]: name,
      };
    }, {});

    if (errorData in errorsByHash) {
      return errorsByHash[errorData];
    } else {
      return undefined;
    }
  }
}

export { WrappedTransactionClass };
