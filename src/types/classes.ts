import { Address, SignerOrProvider, WrappedTransaction } from '../types/core';
import { FungiblePool } from 'classes/FungiblePool';
import { BigNumber, Signer } from 'ethers';

export interface IERC20PoolFactory {
  /**
   * Deploys a cloned pool for the given collateral and quote token and returns new pool instance.
   */
  deployPool(
    signer: Signer,
    collateralAddress: Address,
    quoteAddress: Address,
    interestRate: BigNumber
  ): Promise<WrappedTransaction>;
  /**
   * Returns pool instance for the given collateral and quote tokens addresses.
   */
  getPool(collateralAddress: Address, quoteAddress: Address): Promise<FungiblePool>;
  /**
   * Returns pool address for the given collateral and quote tokens addresses.
   */
  getPoolAddress(collateralAddress: Address, quoteAddress: Address): Promise<Address>;
}

export interface IBaseContract {
  /**
   * Updates current contract provider.
   */
  connect(signerOrProvider: SignerOrProvider): IBaseContract;
  /**
   * Returns current contract provider.
   */
  getProvider(): SignerOrProvider;
}

export interface AuctionStatus {
  /** time auction was kicked */
  kickTime: Date;
  /** remaining collateral available to be purchased */
  collateral: BigNumber;
  /** remaining borrower debt to be covered */
  debtToCover: BigNumber;
  /** true if the grace period has elapsed and the auction has not expired */
  isTakeable: boolean;
  /** helps determine if the liquidation may be settled */
  isCollateralized: boolean;
  /** current price of the auction */
  price: BigNumber;
  /** price at which bond holder is neither rewarded nor penalized */
  neutralPrice: BigNumber;
  /** true if settle may be called on the liquidation */
  isSettleable: boolean;
}

export interface Loan {
  /** collateralization ratio (1e18 = 100%) */
  collateralization: BigNumber;
  /** debt including interest and fees */
  debt: BigNumber;
  /** pledged collateral */
  collateral: BigNumber;
  /** debt divided by collateral */
  thresholdPrice: BigNumber;
  /** kickers penalized if liquidation taken above this price */
  neutralPrice: BigNumber;
  /** estimated bond kicker must post to liquidate */
  liquidationBond: BigNumber;
  /** true if the loan is under liquidation */
  isKicked: boolean;
}

export type DistributionPeriod = {
  id: number;
  isActive: boolean;
  startBlock: number;
  startDate: number;
  endBlock: number;
  endDate: number;
  blockNumber: number;
  fundsAvailable: BigNumber;
  votesCount: BigNumber;
};

export interface IGrantFund {
  /**
   * Handles grant fund methods
   */
  delegateVote(signer: Signer, delegateToAdress: Address): Promise<WrappedTransaction>;
  getVotingPower(signer: Signer, address?: Address): Promise<BigNumber>;
}

export type ProposalParams = {
  title: string;
  recipientAddresses: Array<{
    address: Address;
    amount: string;
  }>;
  externalLink?: string;
  ipfsHash?: string;
  arweaveTxid?: string;
};

export interface IDistributionPeriod {
  /**
   * Handles distribution period methods
   */
  getActiveDistributionPeriod(): Promise<DistributionPeriod>;
  getDistributionPeriod(distributionId: number): Promise<DistributionPeriod>;
  createProposal(signer: Signer, params: ProposalParams): Promise<WrappedTransaction>;
}

export interface IProposal {
  /**
   * Handles methods specific to a given proposal
   */
  getInfo(): Promise<{
    proposalId: BigNumber;
    distributionId: number;
    votesReceived: BigNumber;
    tokensRequested: BigNumber;
    fundingVotesReceived: BigNumber;
    executed: boolean;
  }>;
}
