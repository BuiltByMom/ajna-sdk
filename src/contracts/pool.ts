import {
  Address,
  DebtInfoParamsContract,
  DepositIndexParamsContract,
  LenderInfoParamsContract,
  LoansInfoParamsContract,
  MoveQuoteTokenParamsContract,
  RemoveQuoteTokenParamsContract,
} from '../types';
import { BigNumber, Contract } from 'ethers';
import { createTransaction } from '../utils/transactions';

export const addQuoteToken = async (
  contract: Contract,
  amount: BigNumber,
  bucketIndex: number,
  expiry: number
) => {
  return await createTransaction(
    contract,
    'addQuoteToken',
    [amount, bucketIndex, expiry],
    {
      from: await contract.signer.getAddress(),
    }
  );
};

export const moveQuoteToken = async ({
  contract,
  maxAmountToMove,
  fromIndex,
  toIndex,
  expiry,
}: MoveQuoteTokenParamsContract) => {
  return await contract.moveQuoteToken(
    maxAmountToMove,
    fromIndex,
    toIndex,
    expiry,
    {
      gasLimit: 1000000,
    }
  );
};

export const removeQuoteToken = async ({
  contract,
  maxAmount,
  bucketIndex,
}: RemoveQuoteTokenParamsContract) => {
  return await contract.removeQuoteToken(maxAmount, bucketIndex, {
    gasLimit: 1000000,
  });
};

export const lenderInfo = async ({
  contract,
  lenderAddress,
  index,
}: LenderInfoParamsContract): Promise<[BigNumber, BigNumber]> => {
  return await contract.lenderInfo(index, lenderAddress);
};

export const debtInfo = async ({ contract }: DebtInfoParamsContract) => {
  return await contract.debtInfo();
};

export const loansInfo = async ({
  contract,
}: LoansInfoParamsContract): Promise<[Address, BigNumber, BigNumber]> => {
  return await contract.loansInfo();
};

export const depositIndex = async ({
  contract,
  debtAmount,
}: DepositIndexParamsContract) => {
  return await contract.depositIndex(debtAmount);
};
