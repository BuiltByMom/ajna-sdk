/* eslint-disable @typescript-eslint/no-explicit-any */
import Web3 from 'web3';
import { Contract } from 'web3-eth-contract';

export type ContractType = Contract & {
  methods?: Record<
    string,
    (
      q?: string | unknown | null,
      w?: string | unknown | null,
      e?: string | unknown | null
    ) => any
  >;
  balanceOf: (
    walletAddress: string,
    cb: (_error: any, balance: string) => void
  ) => void;
  decimals: (cb: (_error: any, decimals: number) => void) => void;
  tokenURI: (tokenId: string) => void;
};

export type Erc20Address = string;

export type CollateralAddress = Erc20Address;

export type QuoteAddress = Erc20Address;

type BaseParamsWithWeb3 = {
  web3: Web3;
  poolAddress: Erc20Address;
  from: Erc20Address;
};

type BaseParams = {
  from: Erc20Address;
};

type BaseParamsWithContract = {
  contractPool: Contract;
  from: Erc20Address;
};

export type GenericApproveParamsRaw = BaseParamsWithWeb3 & {
  allowance: string | number;
  tokenAddress: CollateralAddress | QuoteAddress;
};

export type GenericApproveParams = BaseParams & {
  allowance: string | number;
};

export type PledgeCollateralParamsRaw = BaseParamsWithContract & {
  to: Erc20Address;
  collateralToPledge: string | number;
};

export type PledgeCollateralParams = BaseParams & {
  to: Erc20Address;
  collateralToPledge: string | number;
};

export type BorrowParamsRaw = BaseParamsWithContract & {
  amount: string | number;
  bucketIndex: number;
};

export type BorrowParams = BaseParams & {
  amount: string | number;
  bucketIndex: number;
};

export type AddQuoteTokenParams = BorrowParams;

export type AddQuoteTokenParamsRaw = BorrowParamsRaw;

export type RemoveQuoteTokenParams = BorrowParams;

export type QuoteBalanceParamsRaw = {
  web3: Web3;
  quoteAddress: Erc20Address;
  tokenAddress: Erc20Address;
};

export type CollateralBalanceParamsRaw = {
  web3: Web3;
  collateralAddress: Erc20Address;
  tokenAddress: Erc20Address;
};

export type RepayParamsRaw = BaseParamsWithContract & {
  amount: string | number;
};

export type RepayParams = BaseParams & {
  amount: string | number;
};

export type PullCollateralParamsRaw = BaseParamsWithContract & {
  collateralToPledge: string | number;
};

export type PullCollateralParams = BaseParams & {
  collateralToPledge: string | number;
};

export interface FactoryDeployPoolParams {
  collateralAddress: Erc20Address;
  quoteAddress: Erc20Address;
  userAddress: Erc20Address;
  interestRate: string;
}

export type PoolDrawDebtParams = BaseParams & {
  amount: string | number;
  bucketIndex: number;
  collateralToPledge: string | number;
  to: Erc20Address;
};

export type PoolRepayDebtParams = BaseParams & {
  amount: string | number;
  collateralToPledge: string | number;
};
