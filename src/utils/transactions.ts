import { BaseContract, Contract, PopulatedTransaction } from 'ethers';
import { GAS_LIMIT_MAX, GAS_MULTIPLIER } from '../constants';
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
    const txWithMaxGas = this.getTxWithNewGasLimit(
      this._transaction,
      GAS_LIMIT_MAX
    );

    txWithMaxGas.nonce = await this._contract.signer.getTransactionCount(
      'pending'
    );
    console.info(txWithMaxGas);

    return await this._contract.signer.sendTransaction(txWithMaxGas);
  }

  async verifyAndSubmit() {
    const txWithMaxGas = this.getTxWithNewGasLimit(
      this._transaction,
      GAS_LIMIT_MAX
    );

    const estimatedGas = await this._contract.provider.estimateGas(
      txWithMaxGas
    );
    txWithMaxGas.nonce = await this._contract.signer.getTransactionCount(
      'pending'
    );
    console.info(txWithMaxGas);

    const txWithAdjustedGas = this.getTxWithNewGasLimit(
      this._transaction,
      +estimatedGas.mul(GAS_MULTIPLIER)
    );

    console.info(txWithAdjustedGas);

    // await this._contract.provider.call(txWithAdjustedGas);
    return await this._contract.signer.sendTransaction(txWithAdjustedGas);
  }

  private getTxWithNewGasLimit(
    transaction: PopulatedTransaction,
    gasLimit: number
  ) {
    return {
      ...transaction,
      gasLimit,
    };
  }
}
