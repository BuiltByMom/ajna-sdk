import ERC20Pool from '../abis/ERC20Pool.json';
import {
  AddQuoteTokenParamsContract,
  Address,
  DebtInfoParamsContract,
  DepositIndexParamsContract,
  DrawDebtParamsContract,
  GenericApproveParamsContract,
  LenderInfoParamsContract,
  LoansInfoParamsContract,
  MoveQuoteTokenParamsContract,
  RemoveQuoteTokenParamsContract,
  RepayDebtParamsContract,
  SignerOrProvider,
} from '../constants/interfaces';
import { getErc20Contract } from './erc20';
import { BigNumber, ethers } from 'ethers';

export const getErc20PoolContract = (
  poolAddress: Address,
  provider: SignerOrProvider
) => {
  return new ethers.Contract(poolAddress, ERC20Pool, provider);
};

export const drawDebt = async ({
  contractPool,
  borrowerAddress,
  amountToBorrow,
  limitIndex,
  collateralToPledge,
}: DrawDebtParamsContract) => {
  const tx = await contractPool.drawDebt(
    borrowerAddress,
    amountToBorrow,
    limitIndex,
    collateralToPledge,
    {
      gasLimit: 1000000,
    }
  );

  return tx.wait();
};

export const repayDebt = async ({
  contractPool,
  borrowerAddress,
  collateralAmountToPull,
  maxQuoteTokenAmountToRepay,
}: RepayDebtParamsContract) => {
  return await contractPool.repayDebt(
    borrowerAddress,
    collateralAmountToPull,
    maxQuoteTokenAmountToRepay,
    {
      gasLimit: 1000000,
    }
  );
};

export const addQuoteToken = async ({
  contractPool,
  amount,
  bucketIndex,
}: AddQuoteTokenParamsContract) => {
  return await contractPool.addQuoteToken(amount, bucketIndex, {
    gasLimit: 1000000,
  });
};

export const moveQuoteToken = async ({
  contractPool,
  maxAmountToMove,
  fromIndex,
  toIndex,
}: MoveQuoteTokenParamsContract) => {
  return await contractPool.moveQuoteToken(
    maxAmountToMove,
    fromIndex,
    toIndex,
    {
      gasLimit: 1000000,
    }
  );
};

export const removeQuoteToken = async ({
  contractPool,
  maxAmount,
  bucketIndex,
}: RemoveQuoteTokenParamsContract) => {
  return await contractPool.removeQuoteToken(maxAmount, bucketIndex, {
    gasLimit: 1000000,
  });
};

export const lenderInfo = async ({
  contractPool,
  lenderAddress,
  index,
}: LenderInfoParamsContract): Promise<[BigNumber, BigNumber]> => {
  return await contractPool.lenderInfo(index, lenderAddress);
};

export const debtInfo = async ({ contractPool }: DebtInfoParamsContract) => {
  return await contractPool.debtInfo();
};

export const loansInfo = async ({
  contractPool,
}: LoansInfoParamsContract): Promise<[Address, BigNumber, BigNumber]> => {
  return await contractPool.loansInfo();
};

export const depositIndex = async ({
  contractPool,
  debtAmount,
}: DepositIndexParamsContract) => {
  return await contractPool.depositIndex(debtAmount);
};

export const approve = async ({
  provider,
  poolAddress,
  allowance,
  tokenAddress,
}: GenericApproveParamsContract) => {
  const contract = getErc20Contract(tokenAddress, provider);

  return await contract.approve(poolAddress, allowance, {
    gasLimit: 1000000,
  });
};
