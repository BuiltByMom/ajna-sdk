import {
  AddQuoteTokenParams,
  GenericApproveParams,
  MoveQuoteTokenParams,
  Provider,
  RemoveQuoteTokenParams,
  SignerOrProvider
} from '../constants/interfaces';
import {
  addQuoteToken,
  approve,
  getPoolContract,
  moveQuoteToken,
  removeQuoteToken
} from '../contracts/get-pool-contract';
import toWei from '../utils/to-wei';
import { PoolUtils } from './pool-utils';
import { Contract } from 'ethers';

class Pool {
  provider: SignerOrProvider;
  contract: Contract;
  poolAddress: string;
  quoteAddress: string;
  collateralAddress: string;
  utils: PoolUtils;

  constructor(
    provider: SignerOrProvider,
    poolAddress: string,
    collateralAddress: string,
    quoteAddress: string
  ) {
    this.provider = provider;
    this.poolAddress = poolAddress;
    this.contract = getPoolContract(poolAddress, this.provider);
    this.utils = new PoolUtils(this.provider as Provider);
    this.quoteAddress = quoteAddress;
    this.collateralAddress = collateralAddress;
  }

  collateralApprove = async ({ signer, allowance }: GenericApproveParams) => {
    return await approve({
      provider: signer,
      poolAddress: this.poolAddress,
      tokenAddress: this.collateralAddress,
      allowance: toWei(allowance)
    });
  };

  quoteApprove = async ({ signer, allowance }: GenericApproveParams) => {
    return await approve({
      provider: signer,
      poolAddress: this.poolAddress,
      tokenAddress: this.quoteAddress,
      allowance: toWei(allowance)
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
      amount: toWei(amount),
      bucketIndex
    });
  };

  moveQuoteToken = async ({
    signer,
    maxAmountToMove,
    fromIndex,
    toIndex
  }: MoveQuoteTokenParams) => {
    const contractPoolWithSigner = this.contract.connect(signer);

    return await moveQuoteToken({
      contractPool: contractPoolWithSigner,
      maxAmountToMove: toWei(maxAmountToMove),
      fromIndex,
      toIndex
    });
  };

  removeQuoteToken = async ({
    signer,
    maxAmount,
    bucketIndex
  }: RemoveQuoteTokenParams) => {
    const contractPoolWithSigner = this.contract.connect(signer);

    return await removeQuoteToken({
      contractPool: contractPoolWithSigner,
      maxAmount: toWei(maxAmount),
      bucketIndex
    });
  };

  addLiquidity = async ({
    signer,
    amount,
    bucketIndex
  }: AddQuoteTokenParams) => {
    return await this.addQuoteToken({
      signer,
      amount,
      bucketIndex
    });
  };

  removeLiquidity = async ({
    signer,
    maxAmount,
    bucketIndex
  }: RemoveQuoteTokenParams) => {
    return await this.removeQuoteToken({
      signer,
      maxAmount,
      bucketIndex
    });
  };

  moveLiquidity = async ({
    signer,
    maxAmountToMove,
    fromIndex,
    toIndex
  }: MoveQuoteTokenParams) => {
    return await this.moveQuoteToken({
      signer,
      maxAmountToMove,
      fromIndex,
      toIndex
    });
  };

  getPrices = async () => {
    const [hpb, , htp, , lup] = await this.utils.poolPricesInfo(
      this.poolAddress
    );

    return {
      hpb,
      htp,
      lup
    };
  };

  getStats = async () => {
    const [poolSize, loansCount] = await this.utils.poolLoansInfo(
      this.poolAddress
    );
    const [minDebtAmount, collateralization, actualUtilization] =
      await this.utils.poolUtilizationInfo(this.poolAddress);

    return {
      poolSize,
      loansCount,
      minDebtAmount,
      collateralization,
      actualUtilization
    };
  };
}

export { Pool };
