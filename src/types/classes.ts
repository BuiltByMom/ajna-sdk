import { BigNumber, Signer } from 'ethers';
import { FungiblePool } from '../classes/FungiblePool';
import { NonfungiblePool } from '../classes/NonfungiblePool';
import { Address, SignerOrProvider, WrappedTransaction } from '../types/core';

export interface IERC20PoolFactory {
  /**
   * Creates a pool for the given collateral and quote token and returns new pool instance.
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

export interface IERC721PoolFactory {
  /**
   * Creates a pool where any token in a particular NFT collection is valid collateral
   * @param signer pool creator
   * @param nftAddress address of the ERC721 collateral token
   * @param quoteAddress address of the ERC20 quote token
   * @param interestRate initial interest rate, between 1%-10%, as WAD
   */
  deployCollectionPool(
    signer: Signer,
    nftAddress: Address,
    quoteAddress: Address,
    interestRate: BigNumber
  ): Promise<WrappedTransaction>;
  /**
   * Creates a pool where specific tokens in an NFT collection are whitelisted
   * @param signer pool creator
   * @param nftAddress address of the ERC721 collateral token
   * @param subset list of whitelisted tokenIds
   * @param quoteAddress address of the ERC20 quote token
   * @param interestRate initial interest rate, between 1%-10%, as WAD
   */
  deploySubsetPool(
    signer: Signer,
    nftAddress: Address,
    subset: Array<number>,
    quoteAddress: Address,
    interestRate: BigNumber
  ): Promise<WrappedTransaction>;
  // TODO: work in progress
  getPool(collateralAddress: Address, subset: any, quoteAddress: Address): Promise<NonfungiblePool>;
  getPoolAddress(collateralAddress: Address, subset: any, quoteAddress: Address): Promise<Address>;
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

export type VoteParams = [proposalId: string, votesUsed: string];

export type FormattedVoteParams = [proposalId: BigNumber, votesUsed: BigNumber];

export type VoterInfo = [
  // The voter's voting power in the funding round. Equal to the square of their tokens in the voting snapshot.
  votingPower: BigNumber,
  // The voter's remaining quadratic voting power in the given distribution period's funding round.
  remainingVotingPower: BigNumber,
  // The voter's number of proposals voted on in the funding stage.
  votesCast: BigNumber
];

export type FundingVotes = [BigNumber, BigNumber] & { proposalId: BigNumber; votesUsed: BigNumber };
export interface IGrantFund {
  /**
   * Handles grant fund methods
   */
  /** delegates vote to the given delegatee */
  delegateVote(signer: Signer, delegateToAdress: Address): Promise<WrappedTransaction>;
  /** get the address account is currently delegating to */
  getDelegates(address: Address): Promise<Address>;
  /** starts a new distribution period */
  startNewDistributionPeriod(signer: Signer): Promise<WrappedTransaction>;
  /** get the current grants treasury */
  getTreasury(): Promise<BigNumber>;
  /** get the active distribution period */
  getActiveDistributionPeriod(): Promise<IDistributionPeriod>;
  /** get a distribution period by id */
  getDistributionPeriod(distributionId: number): Promise<IDistributionPeriod>;
  /** creates a proposal */
  createProposal(signer: Signer, params: ProposalParams): Promise<WrappedTransaction>;
  /** gets a proposal object by id */
  getProposal(proposalId: BigNumber): IProposal;
}

export interface IDistributionPeriod {
  /**
   * Handles distribution period methods
   */
  id: number;
  isActive: boolean;
  startBlock: number;
  startDate: number;
  endBlock: number;
  endDate: number;
  fundedSlateHash: string;
  fundsAvailable: BigNumber;
  votesCount: BigNumber;
  /** retrieve a bytes32 hash of the current distribution period stage. */
  getStage(address: Address): Promise<string>;
  /** check if current distribution period is on screening stage */
  distributionPeriodStage(): Promise<string>;
  /** get the voter's voting power based on current distribution period stage */
  getVotingPower(address: Address): Promise<BigNumber>;
  /** get the voter's voting power in the screening stage of a distribution period */
  getScreeningVotingPower(address: Address): Promise<BigNumber>;
  /** get the remaining quadratic voting power available to the voter in the funding stage of a distribution period */
  getFundingVotingPower(address: Address): Promise<BigNumber>;
  /** get the number of screening votes cast by an account in a given distribution period. */
  getScreeningVotesCast(address: Address): Promise<string>;
  /** get the list of funding votes cast by an account in a given distribution period. */
  getFundingVotesCast(address: Address): Promise<FundingVotes[]>;
  /** get the current state of a given voter in the funding stage. */
  getVoterInfo(address: Address): Promise<VoterInfo>;
  /** cast an array of screening votes in one transaction. */
  screeningVote(signer: Signer, votes: FormattedVoteParams[]): Promise<WrappedTransaction>;
  /** cast an array of funding votes in one transaction. */
  fundingVote(signer: Signer, votes: FormattedVoteParams[]): Promise<WrappedTransaction>;
  /** cast an array of screening or funding votes (based on current distribution period stage). */
  castVotes(signer: Signer, votes: VoteParams[]): Promise<WrappedTransaction>;
  /** check if a slate of proposals meets requirements, and maximizes votes. If so, set the provided proposal slate as the new top slate of proposals. */
  updateSlate(signer: Signer, proposals: string[]): Promise<WrappedTransaction>;
  /** get current top proposal slate */
  getFundedProposalSlate(): Promise<string[]>;
  /** get best proposals based on the combination of votes received and tokens requested over tokens available. */
  getOptimalProposals(proposalIds: string[], tokensAvailable: string): Promise<string[]>;
}

export enum DistributionPeriodStage {
  SCREENING = 'Screening',
  FUNDING = 'Funding',
  CHALLENGE = 'Challenge',
  FINALIZE = 'Finalize',
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

export const proposalStates = [
  'Pending',
  'Active',
  'Canceled',
  'Defeated',
  'Succeeded',
  'Queued',
  'Expired',
  'Executed',
] as const;

export type ProposalState = (typeof proposalStates)[number];

export interface IProposal {
  /**
   * Handles methods specific to a given proposal
   */
  id: BigNumber;
  getInfo(): Promise<{
    proposalId: BigNumber;
    distributionId: number;
    votesReceived: BigNumber;
    tokensRequested: BigNumber;
    fundingVotesReceived: BigNumber;
    executed: boolean;
  }>;
  getState(): Promise<ProposalState>;
}

export type ProposalInfoArray = [BigNumber, number, BigNumber, BigNumber, BigNumber, boolean];
export interface ProposalInfo {
  proposalId: BigNumber;
  votesReceived: BigNumber;
  tokensRequested: BigNumber;
}
