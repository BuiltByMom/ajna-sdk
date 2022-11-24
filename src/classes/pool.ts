import Web3 from 'web3';
import { Contract } from 'web3-eth-contract';
import {
  getPoolContract,
  addQuoteToken,
  borrow,
  repay,
  pledgeCollateral,
  pullCollateral,
  removeQuoteToken,
  approve
} from '../contracts/get-pool-contract';
import {
  AddQuoteTokenParams,
  PledgeCollateralParams,
  BorrowParams,
  RepayParams,
  PullCollateralParams,
  GenericApproveParams,
  RemoveQuoteTokenParams
} from '../constants/interfaces';

class Pool {
  web3: Web3;
  poolAddress: string;
  quoteAddress: string;
  collateralAddress: string;
  contract: Contract;

  constructor(
    web3: Web3,
    poolAddress: string,
    collateralAddress: string,
    quoteAddress: string
  ) {
    this.web3 = web3;
    this.poolAddress = poolAddress;
    this.contract = getPoolContract(this.web3, poolAddress);
    this.quoteAddress = quoteAddress;
    this.collateralAddress = collateralAddress;
  }

  collateralApprove = async ({ allowance, from }: GenericApproveParams) => {
    return await approve({
      web3: this.web3,
      poolAddress: this.poolAddress,
      tokenAddress: this.collateralAddress,
      allowance,
      from
    });
  };

  quoteApprove = async ({ allowance, from }: GenericApproveParams) => {
    return await approve({
      web3: this.web3,
      poolAddress: this.poolAddress,
      tokenAddress: this.quoteAddress,
      allowance,
      from
    });
  };

  pledgeCollateral = async ({
    to,
    collateralToPledge,
    from
  }: PledgeCollateralParams) => {
    return await pledgeCollateral({
      contractPool: this.contract,
      to,
      collateralToPledge,
      from
    });
  };

  addQuoteToken = async ({
    amount,
    bucketIndex,
    from
  }: AddQuoteTokenParams) => {
    return await addQuoteToken({
      contractPool: this.contract,
      amount,
      bucketIndex,
      from
    });
  };

  borrow = async ({ amount, bucketIndex, from }: BorrowParams) => {
    return await borrow({
      contractPool: this.contract,
      amount,
      bucketIndex,
      from
    });
  };

  repay = async ({ amount, from }: RepayParams) => {
    return await repay({
      contractPool: this.contract,
      amount,
      from
    });
  };

  pullCollateral = async ({
    collateralToPledge,
    from
  }: PullCollateralParams) => {
    return await pullCollateral({
      contractPool: this.contract,
      collateralToPledge,
      from
    });
  };

  removeQuoteToken = async ({
    amount,
    bucketIndex,
    from
  }: RemoveQuoteTokenParams) => {
    return await removeQuoteToken({
      contractPool: this.contract,
      amount,
      bucketIndex,
      from
    });
  };

  addLiquidity = async () => {
    return null;
  };

  removeLiquidity = async () => {
    return null;
  };

  moveLiquidity = async () => {
    return null;
  };

  getPrices = async () => {
    return null;
  };

  getStats = async () => {
    return null;
  };
}

export { Pool };
