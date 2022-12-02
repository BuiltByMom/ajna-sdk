import ERC20Pool from '../abis/ERC20Pool.json';
import {
  AddQuoteTokenParamsContract,
  BorrowParamsContract,
  Erc20Address,
  GenericApproveParamsContract,
  PledgeCollateralParamsContract,
  PullCollateralParamsContract,
  RepayParamsContract,
  SignerOrProvider
} from '../constants/interfaces';
import toWei from '../utils/to-wei';
import { getGenericContract } from './get-generic-contract';
import { ethers } from 'ethers';

export const getPoolContract = (
  poolAddress: Erc20Address,
  provider: SignerOrProvider
) => {
  return new ethers.Contract(poolAddress, ERC20Pool, provider);
};

export const pledgeCollateral = async ({
  contractPool,
  to,
  collateralToPledge
}: PledgeCollateralParamsContract) => {
  const tx = await contractPool.pledgeCollateral(
    to,
    toWei(collateralToPledge),
    {
      gasLimit: 1000000
    }
  );

  return tx.wait();
};

export const borrow = async ({
  contractPool,
  amount,
  bucketIndex
}: BorrowParamsContract) => {
  return await contractPool.borrow(toWei(amount), bucketIndex, {
    gasLimit: 1000000
  });
};

export const addQuoteToken = async ({
  contractPool,
  amount,
  bucketIndex
}: AddQuoteTokenParamsContract) => {
  return await contractPool.addQuoteToken(toWei(amount), bucketIndex, {
    gasLimit: 1000000
  });
};

export const repay = async ({
  from,
  contractPool,
  amount
}: RepayParamsContract) => {
  return await contractPool.repay(from, toWei(amount), {
    gasLimit: 1000000
  });
};

export const pullCollateral = async ({
  contractPool,
  collateralToPledge
}: PullCollateralParamsContract) => {
  return await contractPool.pullCollateral(toWei(collateralToPledge), {
    gasLimit: 1000000
  });
};

export const removeQuoteToken = async ({
  contractPool,
  amount,
  bucketIndex
}: BorrowParamsContract) => {
  return await contractPool.removeQuoteToken(toWei(amount), bucketIndex, {
    gasLimit: 1000000
  });
};

export const approve = async ({
  provider,
  poolAddress,
  allowance,
  tokenAddress
}: GenericApproveParamsContract) => {
  const contract = getGenericContract(tokenAddress, provider);

  return await contract.approve(poolAddress, toWei(allowance), {
    gasLimit: 1000000
  });
};
