import { BaseContract, Contract, PopulatedTransaction } from 'ethers';
import { GAS_MULTIPLIER } from '../constants';
import { TransactionOverrides, WrappedTransaction } from '../types';

export async function createTransaction(
  contract: Contract,
  methodName: string,
  args: Array<any>,
  overrides?: TransactionOverrides
): Promise<WrappedTransaction> {
  const tx = await contract.populateTransaction[methodName](...args, overrides);

  return new WrappedTransactionClass(tx, contract);
}

class WrappedTransactionClass implements WrappedTransaction {
  readonly _transaction: PopulatedTransaction;
  readonly _contract: BaseContract;

  constructor(transaction: PopulatedTransaction, contract: BaseContract) {
    this._transaction = transaction;
    this._contract = contract;
  }

  async submit() {
    return await this._contract.signer.sendTransaction(this._transaction);
  }

  async verifyAndSubmit() {
    const estimatedGas = await this._contract.provider.estimateGas(
      this._transaction
    );

    const txWithAdjustedGas = {
      ...this._transaction,
      gasLimit: estimatedGas.mul(GAS_MULTIPLIER),
    };

    await this._contract.provider.call(txWithAdjustedGas);
    return await this._contract.signer.sendTransaction(txWithAdjustedGas);
  }
}
