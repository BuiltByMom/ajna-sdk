import { Address, TransactionOverrides, CallData } from '../types';
import { createTransaction } from '../utils/transactions';
import { BigNumber, Contract } from 'ethers';

export async function addQuoteToken(
  contract: Contract,
  amount: BigNumber,
  bucketIndex: number,
  expiry: number,
  overrides?: TransactionOverrides
) {
  return await createTransaction(
    contract,
    'addQuoteToken',
    [amount, bucketIndex, expiry],
    overrides
  );
}

export async function moveQuoteToken(
  contract: Contract,
  maxAmountToMove: BigNumber,
  fromIndex: number,
  toIndex: number,
  expiry: number,
  overrides?: TransactionOverrides
) {
  return await createTransaction(
    contract,
    'moveQuoteToken',
    [maxAmountToMove, fromIndex, toIndex, expiry],
    overrides
  );
}

export async function removeQuoteToken(
  contract: Contract,
  maxAmount: BigNumber,
  bucketIndex: number,
  overrides?: TransactionOverrides
) {
  return await createTransaction(contract, 'removeQuoteToken', [maxAmount, bucketIndex], overrides);
}

export async function lenderInfo(
  contract: Contract,
  lenderAddress: Address,
  index: number
): Promise<[BigNumber, BigNumber]> {
  return await contract.lenderInfo(index, lenderAddress);
}

export async function debtInfo(contract: Contract) {
  return await contract.debtInfo();
}

export async function loansInfo(contract: Contract): Promise<[Address, BigNumber, BigNumber]> {
  return await contract.loansInfo();
}

export async function depositIndex(contract: Contract, debtAmount: BigNumber) {
  return await contract.depositIndex(debtAmount);
}

export async function multicall(
  contract: Contract,
  callData: Array<CallData>,
  overrides?: TransactionOverrides
) {
  const multicallData = callData.map(callData =>
    contract.interface.encodeFunctionData(callData.methodName, callData.args)
  );

  return await createTransaction(contract, 'multicall', [multicallData], overrides);
}
