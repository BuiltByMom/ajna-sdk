/* eslint-disable @typescript-eslint/no-explicit-any */
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
