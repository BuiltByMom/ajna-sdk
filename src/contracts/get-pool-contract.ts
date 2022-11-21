import Web3 from 'web3';
import { AbiItem } from 'web3-utils';
import {
  BorrowParams,
  PledgeCollateralParams,
  PullCollateralParams,
  RepayParams
} from '../constants/interfaces';
import toWei from '../utils/to-wei';
import ERC20Pool from '../abis/ERC20Pool.json';

export const getPoolContract = (web3: Web3, poolAddress: string) => {
  return new web3.eth.Contract(ERC20Pool as AbiItem[], poolAddress);
};

export const pledgeCollateral = async (params: PledgeCollateralParams) => {
  const { web3, poolAddress, to, collateralToPledge, from } = params;
  const contractPool = getPoolContract(web3, poolAddress);

  return await contractPool.methods
    .pledgeCollateral(to, toWei(collateralToPledge))
    .send({
      from,
      gas: 200000
    });
};

export const borrow = async (params: BorrowParams) => {
  const { web3, poolAddress, amount, bucketIndex, from } = params;
  const contractPool = getPoolContract(web3, poolAddress);

  return await contractPool.methods.borrow(toWei(amount), bucketIndex).send({
    from,
    gas: 2000000
  });
};

export const addQuoteToken = async (params: BorrowParams) => {
  const { web3, poolAddress, amount, bucketIndex, from } = params;
  const contractPool = getPoolContract(web3, poolAddress);

  return await contractPool.methods
    .addQuoteToken(toWei(amount), bucketIndex)
    .send({
      from: from,
      gas: 2000000
    });
};

export const repay = async (params: RepayParams) => {
  const { web3, poolAddress, amount, from } = params;
  const contractPool = getPoolContract(web3, poolAddress);

  return await contractPool.methods.repay(from, toWei(amount)).send({
    from: from,
    gas: 2000000
  });
};

export const pullCollateral = async (params: PullCollateralParams) => {
  const { web3, poolAddress, collateralToPledge, from } = params;
  const contractPool = getPoolContract(web3, poolAddress);

  return await contractPool.methods
    .pullCollateral(toWei(collateralToPledge))
    .send({
      from,
      gas: 2000000
    });
};

export const removeQuoteToken = async (params: BorrowParams) => {
  const { web3, poolAddress, amount, bucketIndex, from } = params;
  const contractPool = getPoolContract(web3, poolAddress);

  return await contractPool.methods
    .removeQuoteToken(toWei(amount), bucketIndex)
    .send({
      from: from,
      gas: 2000000
    });
};
