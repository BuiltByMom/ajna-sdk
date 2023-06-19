import { BigNumber, Contract, Signer } from 'ethers';
import { Address, CallData, TransactionOverrides } from '../types';
import { createTransaction, estimateGasCostAndSendTx } from '../utils';
import { ErcPool } from '../types/typechain';

export async function addQuoteToken(
  contract: ErcPool,
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
  contract: ErcPool,
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
  contract: ErcPool,
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
  contract: ErcPool,
  lenderAddress: Address,
  index: number
): Promise<[BigNumber, BigNumber]> {
  return await contract.lenderInfo(index, lenderAddress);
}

export async function debtInfo(contract: ErcPool) {
  return await contract.debtInfo();
}

export async function loansInfo(contract: ErcPool): Promise<[Address, BigNumber, BigNumber]> {
  return await contract.loansInfo();
}

export async function kickerInfo(
  contract: ErcPool,
  kicker: Address
): Promise<[BigNumber, BigNumber]> {
  return await contract.kickerInfo(kicker);
}

export async function depositIndex(contract: ErcPool, debtAmount: BigNumber) {
  return await contract.depositIndex(debtAmount);
}

export async function collateralAddress(contract: ErcPool) {
  return await contract.collateralAddress();
}

export async function quoteTokenAddress(contract: ErcPool) {
  return await contract.quoteTokenAddress();
}

export async function quoteTokenScale(contract: ErcPool) {
  return await contract.quoteTokenScale();
}

export async function repayDebt(
  contract: ErcPool,
  borrowerAddress: Address,
  maxQuoteTokenAmountToRepay: BigNumber,
  collateralAmountToPull: BigNumber,
  collateralReceiver: Address,
  limitIndex: number,
  overrides?: TransactionOverrides
) {
  return await estimateGasCostAndSendTx(
    contract,
    'repayDebt',
    [
      borrowerAddress,
      maxQuoteTokenAmountToRepay,
      collateralAmountToPull,
      collateralReceiver,
      limitIndex,
    ],
    overrides
  );
}

export async function removeCollateral(
  contract: ErcPool,
  bucketIndex: number,
  maxAmount: BigNumber,
  overrides?: TransactionOverrides
) {
  return await createTransaction(
    contract,
    { methodName: 'removeCollateral', args: [maxAmount, bucketIndex] },
    overrides
  );
}

export async function kickWithDeposit(
  contract: ErcPool,
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

export async function bucketTake(
  contract: ErcPool,
  borrowerAddress: Address,
  depositTake: boolean,
  bucketIndex: number,
  overrides?: TransactionOverrides
) {
  return await createTransaction(
    contract,
    { methodName: 'bucketTake', args: [borrowerAddress, depositTake, bucketIndex] },
    overrides
  );
}

export async function take(
  contract: ErcPool,
  borrowerAddress: Address,
  maxAmount: BigNumber,
  callee: Address,
  callData?: CallData,
  overrides?: TransactionOverrides
) {
  const encodedCallData = callData
    ? // @ts-ignore
      contract.interface.encodeFunctionData('take', callData.args)
    : [];

  console.log(`encodedCallData:`, encodedCallData);
  return await estimateGasCostAndSendTx(
    contract,
    'take',
    [borrowerAddress, maxAmount, callee, encodedCallData],
    overrides
  );
}

export async function kick(
  contract: ErcPool,
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
  contract: ErcPool,
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
  contract: ErcPool,
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

export async function takeReserves(
  contract: ErcPool,
  maxAmount: BigNumber,
  overrides?: TransactionOverrides
) {
  return await estimateGasCostAndSendTx(contract, 'takeReserves', [maxAmount], overrides);
}

export async function approveLPTransferors(
  signer: Signer,
  pool: ErcPool,
  transferors: Array<Address>,
  overrides: TransactionOverrides = {}
) {
  return await estimateGasCostAndSendTx(
    pool.connect(signer),
    'approveLPTransferors',
    [transferors],
    overrides
  );
}
