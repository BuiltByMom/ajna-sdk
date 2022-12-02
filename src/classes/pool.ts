import {
  AddQuoteTokenParams,
  BorrowParams,
  GenericApproveParams,
  PledgeCollateralParams,
  PullCollateralParams,
  RemoveQuoteTokenParams,
  RepayParams,
  SignerOrProvider
} from '../constants/interfaces';
import {
  addQuoteToken,
  approve,
  borrow,
  getPoolContract,
  pledgeCollateral,
  pullCollateral,
  removeQuoteToken,
  repay
} from '../contracts/get-pool-contract';
import { Contract } from 'ethers';

class Pool {
  provider: SignerOrProvider;
  contract: Contract;
  poolAddress: string;
  quoteAddress: string;
  collateralAddress: string;

  constructor(
    provider: SignerOrProvider,
    poolAddress: string,
    collateralAddress: string,
    quoteAddress: string
  ) {
    this.provider = provider;
    this.poolAddress = poolAddress;
    this.contract = getPoolContract(poolAddress, this.provider);
    this.quoteAddress = quoteAddress;
    this.collateralAddress = collateralAddress;
  }

  collateralApprove = async ({ signer, allowance }: GenericApproveParams) => {
    return await approve({
      provider: signer,
      poolAddress: this.poolAddress,
      tokenAddress: this.collateralAddress,
      allowance
    });
  };

  quoteApprove = async ({ signer, allowance }: GenericApproveParams) => {
    return await approve({
      provider: signer,
      poolAddress: this.poolAddress,
      tokenAddress: this.quoteAddress,
      allowance
    });
  };

  pledgeCollateral = async ({
    signer,
    to,
    collateralToPledge
  }: PledgeCollateralParams) => {
    const contractPoolWithSigner = this.contract.connect(signer);

    return await pledgeCollateral({
      contractPool: contractPoolWithSigner,
      to,
      collateralToPledge
    });
  };

  addQuoteToken = async ({
    signer,
    amount,
    bucketIndex
  }: AddQuoteTokenParams) => {
    const contractPoolWithSigner = this.contract.connect(signer);

    return await addQuoteToken({
      contractPool: contractPoolWithSigner,
      amount,
      bucketIndex
    });
  };

  borrow = async ({ signer, amount, bucketIndex }: BorrowParams) => {
    const contractPoolWithSigner = this.contract.connect(signer);

    return await borrow({
      contractPool: contractPoolWithSigner,
      amount,
      bucketIndex
    });
  };

  repay = async ({ signer, amount }: RepayParams) => {
    const contractPoolWithSigner = this.contract.connect(signer);

    return await repay({
      contractPool: contractPoolWithSigner,
      amount,
      from: await signer.getAddress()
    });
  };

  pullCollateral = async ({
    signer,
    collateralToPledge
  }: PullCollateralParams) => {
    const contractPoolWithSigner = this.contract.connect(signer);

    return await pullCollateral({
      contractPool: contractPoolWithSigner,
      collateralToPledge
    });
  };

  removeQuoteToken = async ({
    signer,
    amount,
    bucketIndex
  }: RemoveQuoteTokenParams) => {
    const contractPoolWithSigner = this.contract.connect(signer);

    return await removeQuoteToken({
      contractPool: contractPoolWithSigner,
      amount,
      bucketIndex
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
