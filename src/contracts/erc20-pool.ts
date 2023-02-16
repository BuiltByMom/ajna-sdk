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
  contract,
  borrowerAddress,
  amountToBorrow,
  limitIndex,
  collateralToPledge,
}: DrawDebtParamsContract) => {
  const tx = await contract.drawDebt(
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
  contract,
  borrowerAddress,
  collateralAmountToPull,
  maxQuoteTokenAmountToRepay,
}: RepayDebtParamsContract) => {
  return await contract.repayDebt(
    borrowerAddress,
    collateralAmountToPull,
    maxQuoteTokenAmountToRepay,
    {
      gasLimit: 1000000,
    }
  );
};

export const addQuoteToken = async ({
  contract,
  amount,
  bucketIndex,
}: AddQuoteTokenParamsContract) => {
  return await contract.addQuoteToken(amount, bucketIndex, {
    gasLimit: 1000000,
  });
};

export const moveQuoteToken = async ({
  contract,
  maxAmountToMove,
  fromIndex,
  toIndex,
}: MoveQuoteTokenParamsContract) => {
  return await contract.moveQuoteToken(maxAmountToMove, fromIndex, toIndex, {
    gasLimit: 1000000,
  });
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
