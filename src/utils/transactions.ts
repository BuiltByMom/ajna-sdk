import { GAS_MULTIPLIER } from '../constants';
import { TransactionOverrides, WrappedTransaction } from '../types';
import { BaseContract, Contract, PopulatedTransaction } from 'ethers';

/**
 * Creates a wrapped transaction object that can be used to submit, verify, and estimate gas for a transaction.
 * @param {Contract} contract - The ethers.js contract instance.
 * @param {string} methodName - The name of the method that is being called on the contract.
 * @param {Array<any>} args - The arguments passed to the method.
 * @param {TransactionOverrides} [overrides] - The transaction overrides (e.g. gas price, gas limit, nonce, etc.).
 * @returns {Promise<WrappedTransaction>} - The wrapped transaction object.
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
 * @implements WrappedTransaction
 */
class WrappedTransactionClass implements WrappedTransaction {
  readonly _transaction: PopulatedTransaction;
  readonly _contract: BaseContract;

  /**
   * Creates a new wrapped transaction instance.
   * @param {PopulatedTransaction} transaction - The populated transaction object.
   * @param {BaseContract} contract - The ethers.js contract instance.
   */
  constructor(transaction: PopulatedTransaction, contract: BaseContract) {
    this._transaction = transaction;
    this._contract = contract;
  }

  /**
   * Verifies that the transaction is valid by calling the transaction with the current state of the blockchain. If the transaction is reverted, an error will be thrown.
   * @returns {Promise<any>} - The result of the transaction call.
   */
  async verify() {
    return await this._contract.provider.call(this._transaction);
  }

  /**
   * Submits the transaction to the network. Returns transaction response.
   * @returns {Promise<any>} - The transaction receipt.
   */
  async submitResponse() {
    return await this._contract.signer.sendTransaction(this._transaction);
  }

  /**
   * Submits the transaction and waits for confirmation.
   * @param {number} [confirmations] - The number of confirmations to wait for (default is 1).
   * @returns {Promise<any>} - The transaction receipt.
   */
  async submit(confirmations?: number) {
    const response = await this.submitResponse();
    return await response.wait(confirmations);
  }

  /**
   * Verifies the transaction and submits it with an adjusted gas limit. Returns transaction response.
   * @returns {Promise<any>} - The transaction receipt.
   */
  async verifyAndSubmitResponse() {
    const estimatedGas = await this._contract.provider.estimateGas(this._transaction);

    const txWithAdjustedGas = {
      ...this._transaction,
      gasLimit: +estimatedGas.mul(GAS_MULTIPLIER),
    };

    return await this._contract.signer.sendTransaction(txWithAdjustedGas);
  }

  /**
   * Verifies the transaction and submits it with an adjusted gas limit, and waits for confirmation.
   * @param {number} [confirmations] - The number of confirmations to wait for (default is 1).
   * @returns {Promise<any>} - The transaction receipt.
   */
  async verifyAndSubmit(confirmations?: number) {
    const response = await this.verifyAndSubmitResponse();
    return await response.wait(confirmations);
  }
}
