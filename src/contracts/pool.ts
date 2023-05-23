import { BigNumber } from 'ethers';
import { Address, TransactionOverrides, POOLS_CONTRACTS } from '../types';
import { createTransaction } from '../utils/transactions';

export async function addQuoteToken(
  contract: POOLS_CONTRACTS,
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
  contract: POOLS_CONTRACTS,
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
  contract: POOLS_CONTRACTS,
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
  contract: any,
  lenderAddress: Address,
  index: number
): Promise<[BigNumber, BigNumber]> {
  return await contract.lenderInfo(index, lenderAddress);
}

export async function debtInfo(contract: POOLS_CONTRACTS) {
  return await contract.debtInfo();
}

export async function loansInfo(
  contract: POOLS_CONTRACTS
): Promise<[Address, BigNumber, BigNumber]> {
  return await contract.loansInfo();
}

export async function depositIndex(contract: POOLS_CONTRACTS, debtAmount: BigNumber) {
  return await contract.depositIndex(debtAmount);
}

export async function collateralAddress(contract: POOLS_CONTRACTS) {
  return await contract.collateralAddress();
}

export async function quoteTokenAddress(contract: POOLS_CONTRACTS) {
  return await contract.quoteTokenAddress();
}

export async function quoteTokenScale(contract: POOLS_CONTRACTS) {
  return await contract.quoteTokenScale();
}

export async function kickWithDeposit(
  contract: POOLS_CONTRACTS,
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
  contract: POOLS_CONTRACTS,
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
  contract: POOLS_CONTRACTS,
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
  contract: POOLS_CONTRACTS,
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

export async function kickReserveAuction(
  contract: POOLS_CONTRACTS,
  overrides?: TransactionOverrides
) {
  return await createTransaction(contract, { methodName: 'kickReserveAuction' }, overrides);
}

// TODO: this method returns value and needs transaction return value support
export async function takeReserves(
  contract: POOLS_CONTRACTS,
  maxAmount: BigNumber,
  overrides?: TransactionOverrides
) {
  return await createTransaction(
    contract,
    { methodName: 'takeReserves', args: [maxAmount] },
    overrides
  );
}
