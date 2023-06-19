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

export async function kickerInfo(
  contract: Contract,
  kicker: Address
): Promise<[BigNumber, BigNumber]> {
  return await contract.kickerInfo(kicker);
}

export async function depositIndex(contract: Contract, debtAmount: BigNumber) {
  return await contract.depositIndex(debtAmount);
}

export async function collateralAddress(contract: Contract) {
  return await contract.collateralAddress();
}

export async function quoteTokenAddress(contract: Contract) {
  return await contract.quoteTokenAddress();
}

export async function quoteTokenScale(contract: Contract) {
  return await contract.quoteTokenScale();
}

export async function kickWithDeposit(
  contract: Contract,
  index: number,
  limitIndex: number,
  overrides?: TransactionOverrides
) {
  return await createTransaction(
    contract,
    { methodName: 'kickWithDeposit', args: [index, limitIndex] },
    overrides
  );
}

export async function kick(
  contract: Contract,
  borrowerAddress: Address,
  limitIndex: number,
  overrides?: TransactionOverrides
) {
  return await createTransaction(
    contract,
    { methodName: 'kick', args: [borrowerAddress, limitIndex] },
    overrides
  );
}

export async function settle(
  contract: Contract,
  borrowerAddress: Address,
  maxDepth: number,
  overrides?: TransactionOverrides
) {
  return await createTransaction(
    contract,
    { methodName: 'settle', args: [borrowerAddress, maxDepth] },
    overrides
  );
}

export async function withdrawBonds(
  contract: Contract,
  recipientAddress: Address,
  maxAmount: BigNumber,
  overrides?: TransactionOverrides
) {
  return await createTransaction(
    contract,
    { methodName: 'withdrawBonds', args: [recipientAddress, maxAmount] },
    overrides
  );
}

export async function kickReserveAuction(contract: Contract, overrides?: TransactionOverrides) {
  return await createTransaction(contract, { methodName: 'kickReserveAuction' }, overrides);
}

// TODO: this method returns value and needs transaction return value support
export async function takeReserves(
  contract: Contract,
  maxAmount: BigNumber,
  overrides?: TransactionOverrides
) {
  return await createTransaction(
    contract,
    { methodName: 'takeReserves', args: [maxAmount] },
    overrides
  );
}
