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

type BaseParams = {
  web3: Web3;
  poolAddress: string;
  from: string;
};

export type GenericApproveParams = BaseParams & {
  allowance: string | number;
};

export type CollateralApproveParams = GenericApproveParams & {
  collateralAddress: string;
};

export type QuoteApproveParams = GenericApproveParams & {
  quoteAddress: string;
};

export type PledgeCollateralParams = BaseParams & {
  to: string;
  collateralToPledge: string;
};

export type BorrowParams = BaseParams & {
  amount: string | number;
  bucketIndex: number;
};

export type QuoteBalanceParams = {
  web3: Web3;
  quoteAddress: string;
  tokenAddress: string;
};

export type CollateralBalanceParams = {
  web3: Web3;
  collateralAddress: string;
  tokenAddress: string;
};

export type RepayParams = BaseParams & {
  amount: string | number;
};

export type PullCollateralParams = BaseParams & {
  collateralToPledge: string | number;
};
