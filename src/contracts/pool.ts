import { BigNumber, Contract } from 'ethers';
import { Address, TransactionOverrides } from '../types';
import { createTransaction } from '../utils/transactions';

export async function addQuoteToken(
  contract: Contract,
  amount: BigNumber,
  bucketIndex: number,
  expiry: number,
  overrides?: TransactionOverrides
) {
  return await createTransaction(
    contract,
    { methodName: 'addQuoteToken', args: [amount, bucketIndex, expiry] },
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
    { methodName: 'moveQuoteToken', args: [maxAmountToMove, fromIndex, toIndex, expiry] },
    overrides
  );
}

export async function removeQuoteToken(
  contract: Contract,
  maxAmount: BigNumber,
  bucketIndex: number,
  overrides?: TransactionOverrides
) {
  return await createTransaction(
    contract,
    { methodName: 'removeQuoteToken', args: [maxAmount, bucketIndex] },
    overrides
  );
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
