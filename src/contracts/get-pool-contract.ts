import Web3 from 'web3';
import { AbiItem } from 'web3-utils';
import {
  BorrowParamsRaw,
  PledgeCollateralParamsRaw,
  PullCollateralParamsRaw,
  RepayParamsRaw,
  GenericApproveParamsRaw,
  AddQuoteTokenParamsRaw,
  Erc20Address
} from '../constants/interfaces';
import toWei from '../utils/to-wei';
import ERC20Pool from '../abis/ERC20Pool.json';
import { getGenericContract } from './get-generic-contract';

export const getPoolContract = (web3: Web3, poolAddress: Erc20Address) => {
  return new web3.eth.Contract(ERC20Pool as AbiItem[], poolAddress);
};

export const pledgeCollateral = async ({
  contractPool,
  to,
  collateralToPledge,
  from
}: PledgeCollateralParamsRaw) => {
  return await contractPool.methods
    .pledgeCollateral(to, toWei(collateralToPledge))
    .send({
      from,
      gas: 200000
    });
};

export const borrow = async ({
  contractPool,
  amount,
  bucketIndex,
  from
}: BorrowParamsRaw) => {
  return await contractPool.methods.borrow(toWei(amount), bucketIndex).send({
    from,
    gas: 2000000
  });
};

export const addQuoteToken = async ({
  contractPool,
  amount,
  bucketIndex,
  from
}: AddQuoteTokenParamsRaw) => {
  return await contractPool.methods
    .addQuoteToken(toWei(amount), bucketIndex)
    .send({
      from: from,
      gas: 2000000
    });
};

export const repay = async ({ contractPool, amount, from }: RepayParamsRaw) => {
  return await contractPool.methods.repay(from, toWei(amount)).send({
    from: from,
    gas: 2000000
  });
};

export const pullCollateral = async ({
  contractPool,
  collateralToPledge,
  from
}: PullCollateralParamsRaw) => {
  return await contractPool.methods
    .pullCollateral(toWei(collateralToPledge))
    .send({
      from,
      gas: 2000000
    });
};

export const removeQuoteToken = async ({
  contractPool,
  amount,
  bucketIndex,
  from
}: BorrowParamsRaw) => {
  return await contractPool.methods
    .removeQuoteToken(toWei(amount), bucketIndex)
    .send({
      from: from,
      gas: 2000000
    });
};

export const approve = async ({
  web3,
  poolAddress,
  allowance,
  tokenAddress,
  from
}: GenericApproveParamsRaw) => {
  const contract = getGenericContract(web3, tokenAddress);

  return await contract.methods.approve(poolAddress, toWei(allowance)).send({
    from,
    gas: 2000000
  });
};
