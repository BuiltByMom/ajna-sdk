import { BigNumber, BigNumberish, Contract, Signer } from 'ethers';
import { Address, CallData, TransactionOverrides } from '../types';
import { createTransaction } from '../utils/transactions';

export async function addQuoteToken(
  contract: Contract,
  amount: BigNumber,
  bucketIndex: number,
  expiry: number,
  revertBelowLUP: boolean,
  overrides?: TransactionOverrides
) {
  return await createTransaction(
    contract,
    { methodName: 'addQuoteToken', args: [amount, bucketIndex, expiry, revertBelowLUP] },
    overrides
  );
}

export async function moveQuoteToken(
  contract: Contract,
  maxAmountToMove: BigNumber,
  fromIndex: number,
  toIndex: number,
  expiry: number,
  revertBelowLUP: boolean,
  overrides?: TransactionOverrides
) {
  return await createTransaction(
    contract,
    {
      methodName: 'moveQuoteToken',
      args: [maxAmountToMove, fromIndex, toIndex, expiry, revertBelowLUP],
    },
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

export async function interestRateInfo(contract: Contract): Promise<[BigNumber, BigNumber]> {
  return await contract.interestRateInfo();
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

export async function lpAllowance(
  contract: Contract,
  index: BigNumberish,
  spender: Address,
  owner: Address
) {
  return await contract.lpAllowance(index, spender, owner);
}

export async function increaseLPAllowance(
  contract: Contract,
  spender: Address,
  indexes: Array<BigNumberish>,
  amounts: Array<BigNumberish>,
  overrides?: TransactionOverrides
) {
  return await createTransaction(
    contract,
    { methodName: 'increaseLPAllowance', args: [spender, indexes, amounts] },
    overrides
  );
}

export async function stampLoan(contract: Contract, overrides?: TransactionOverrides) {
  return await createTransaction(contract, { methodName: 'stampLoan', args: [] }, overrides);
}

export async function lenderKick(
  contract: Contract,
  index: number,
  limitIndex: number,
  overrides?: TransactionOverrides
) {
  return await createTransaction(
    contract,
    { methodName: 'lenderKick', args: [index, limitIndex] },
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

export async function bucketTake(
  contract: Contract,
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
  contract: Contract,
  borrowerAddress: Address,
  collateralAmount: BigNumber, // maxAmount for ERC20Pools, amount for ERC721Pools
  callee: Address,
  callData?: CallData,
  overrides?: TransactionOverrides
) {
  const encodedCallData = callData
    ? contract.interface.encodeFunctionData(callData.methodName, callData.args)
    : [];

  return await createTransaction(
    contract,
    { methodName: 'take', args: [borrowerAddress, collateralAmount, callee, encodedCallData] },
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

export async function updateInterest(contract: Contract, overrides?: TransactionOverrides) {
  return await createTransaction(contract, { methodName: 'updateInterest' }, overrides);
}

export async function kickReserveAuction(contract: Contract, overrides?: TransactionOverrides) {
  return await createTransaction(contract, { methodName: 'kickReserveAuction' }, overrides);
}

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

export async function approveLPTransferors(
  signer: Signer,
  pool: Contract,
  transferors: Array<Address>,
  overrides?: TransactionOverrides
) {
  return createTransaction(
    pool.connect(signer),
    {
      methodName: 'approveLPTransferors',
      args: [transferors],
    },
    overrides
  );
}

export async function revokeLPTransferors(
  signer: Signer,
  pool: Contract,
  transferors: Array<Address>,
  overrides?: TransactionOverrides
) {
  return createTransaction(
    pool.connect(signer),
    { methodName: 'revokeLPTransferors', args: [transferors] },
    overrides
  );
}
