import { GAS_MULTIPLIER } from '../constants';
import { TransactionOverrides, WrappedTransaction } from '../types';
import { BaseContract, Contract, PopulatedTransaction } from 'ethers';

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

class WrappedTransactionClass implements WrappedTransaction {
  readonly _transaction: PopulatedTransaction;
  readonly _contract: BaseContract;

  constructor(transaction: PopulatedTransaction, contract: BaseContract) {
    this._transaction = transaction;
    this._contract = contract;
  }

  async verify() {
    return await this._contract.provider.call(this._transaction);
  }

  async submitResponse() {
    return await this._contract.signer.sendTransaction(this._transaction);
  }

  async submit(confirmations?: number) {
    const response = await this.submitResponse();
    return await response.wait(confirmations);
  }

  async verifyAndSubmitResponse() {
    const estimatedGas = await this._contract.provider.estimateGas(this._transaction);

    const txWithAdjustedGas = {
      ...this._transaction,
      gasLimit: +estimatedGas.mul(GAS_MULTIPLIER),
    };

    return await this._contract.signer.sendTransaction(txWithAdjustedGas);
  }

  async verifyAndSubmit(confirmations?: number) {
    const response = await this.verifyAndSubmitResponse();
    return await response.wait(confirmations);
  }
}
