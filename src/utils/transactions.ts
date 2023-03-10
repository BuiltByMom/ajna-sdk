import {
  BaseContract,
  BigNumber,
  Contract,
  PopulatedTransaction,
} from 'ethers';
import { SdkError } from '../classes/types';
import { GAS_LIMIT_MAX, GAS_MULTIPLIER } from '../constants/defaults';
import { TransactionParams, WrappedTransaction } from '../constants/interfaces';

export async function createTransaction(
  contract: Contract,
  methodName: string,
  args: Array<any>,
  overrides?: TransactionParams
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
    let estimatedGas: BigNumber | undefined;

    try {
      estimatedGas = await this._contract.provider.estimateGas(
        this._transaction
      );
    } catch (e: any) {
      throw new SdkError(e?.toString());
    }

    this._transaction.gasLimit = estimatedGas
      ? estimatedGas.mul(GAS_MULTIPLIER)
      : BigNumber.from(GAS_LIMIT_MAX);

    try {
      await this._contract.provider.call(this._transaction);
    } catch (e: any) {
      throw new SdkError(e?.toString());
    }

    return await this._contract.signer.sendTransaction(this._transaction);
  }
}
