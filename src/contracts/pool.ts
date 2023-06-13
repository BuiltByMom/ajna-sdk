import { BigNumber } from 'ethers';
import { Address, TOKEN_POOL, TransactionOverrides } from '../types';
import { createTransaction } from '../utils/transactions';

export async function addQuoteToken(
  contract: TOKEN_POOL,
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
  contract: TOKEN_POOL,
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
  contract: TOKEN_POOL,
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
  contract: TOKEN_POOL,
  lenderAddress: Address,
  index: number
): Promise<[BigNumber, BigNumber]> {
  return await contract.lenderInfo(index, lenderAddress);
}

export async function debtInfo(contract: TOKEN_POOL) {
  return await contract.debtInfo();
}

export async function loansInfo(contract: TOKEN_POOL): Promise<[Address, BigNumber, BigNumber]> {
  return await contract.loansInfo();
}

export async function depositIndex(contract: TOKEN_POOL, debtAmount: BigNumber) {
  return await contract.depositIndex(debtAmount);
}

export async function collateralAddress(contract: TOKEN_POOL) {
  return await contract.collateralAddress();
}

export async function quoteTokenAddress(contract: TOKEN_POOL) {
  return await contract.quoteTokenAddress();
}

export async function quoteTokenScale(contract: TOKEN_POOL) {
  return await contract.quoteTokenScale();
}

export async function kickWithDeposit(
  contract: TOKEN_POOL,
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
  contract: TOKEN_POOL,
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
  contract: TOKEN_POOL,
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
  contract: TOKEN_POOL,
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

export async function kickReserveAuction(contract: TOKEN_POOL, overrides?: TransactionOverrides) {
  return await createTransaction(contract, { methodName: 'kickReserveAuction' }, overrides);
}

// TODO: this method returns value and needs transaction return value support
export async function takeReserves(
  contract: TOKEN_POOL,
  maxAmount: BigNumber,
  overrides?: TransactionOverrides
) {
  return await createTransaction(
    contract,
    { methodName: 'takeReserves', args: [maxAmount] },
    overrides
  );
}
