import { BigNumberish, Contract, Signer, providers } from 'ethers';

export type SignerOrProvider = Signer | providers.Provider;

export type Provider = providers.Provider;

export type Erc20Address = string;

export type CollateralAddress = Erc20Address;

export type QuoteAddress = Erc20Address;

type BaseParams = {
  signer: Signer;
};

type BaseParamsWithPool = {
  contractPool: Contract;
};

export type GenericApproveParamsContract = {
  provider: SignerOrProvider;
  poolAddress: Erc20Address;
  allowance: BigNumberish;
  tokenAddress: CollateralAddress | QuoteAddress;
};

export type GenericApproveParams = BaseParams & {
  allowance: BigNumberish;
};

export type PledgeCollateralParamsContract = BaseParamsWithPool & {
  to: Erc20Address;
  collateralToPledge: BigNumberish;
};

export type PledgeCollateralParams = BaseParams & {
  to: Erc20Address;
  collateralToPledge: BigNumberish;
};

export type BorrowParamsContract = BaseParamsWithPool & {
  amount: BigNumberish;
  bucketIndex: number;
};

export type BorrowParams = BaseParams & {
  amount: BigNumberish;
  bucketIndex: number;
};

export type AddQuoteTokenParams = BaseParams & {
  amount: BigNumberish;
  bucketIndex: number;
};

export type AddQuoteTokenParamsContract = BorrowParamsContract;

export type RemoveQuoteTokenParams = BorrowParams;

export type QuoteBalanceParamsContract = {
  provider: SignerOrProvider;
  quoteAddress: Erc20Address;
  tokenAddress: Erc20Address;
};

export type CollateralBalanceParamsContract = {
  provider: SignerOrProvider;
  collateralAddress: Erc20Address;
  tokenAddress: Erc20Address;
};

export type RepayParamsContract = BaseParamsWithPool & {
  from: Erc20Address;
  amount: BigNumberish;
};

export type RepayParams = BaseParams & {
  amount: BigNumberish;
};

export type PullCollateralParamsContract = BaseParamsWithPool & {
  collateralToPledge: BigNumberish;
};

export type PullCollateralParams = BaseParams & {
  collateralToPledge: BigNumberish;
};

export type FactoryDeployPoolParams = BaseParams & {
  collateralAddress: Erc20Address;
  quoteAddress: Erc20Address;
  interestRate: string;
};

export type PoolDrawDebtParams = BaseParams & {
  amount: BigNumberish;
  bucketIndex: number;
  collateralToPledge: BigNumberish;
  to: Erc20Address;
};

export type PoolRepayDebtParams = BaseParams & {
  amount: BigNumberish;
  collateralToPledge: BigNumberish;
};
