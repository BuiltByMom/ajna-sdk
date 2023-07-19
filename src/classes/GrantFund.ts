import { Provider } from '@ethersproject/providers';
import { BigNumber, Signer, utils } from 'ethers';
import { SCREENING_STAGE } from '../constants';
import { DISTRIBUTION_PERIOD_DURATION } from '../constants/common';
import {
  createProposal,
  delegateVote,
  fundingVote,
  getCurrentDistributionId,
  getDelegates,
  getDistributionPeriod,
  getFundingVotesCast,
  getScreeningVotesCast,
  getStage as getStageContract,
  getTreasury,
  getVoterInfo,
  getVotesFunding as getVotesFundingContract,
  getVotesScreening as getVotesScreeningContract,
  screeningVote,
  startNewDistributionPeriod,
} from '../contracts/grant-fund';
import {
  Address,
  IGrantFund,
  ProposalParams,
  SdkError,
  SignerOrProvider,
  VoteParams,
  WrappedTransaction,
} from '../types';
import { ContractBase } from './ContractBase';
import { DistributionPeriod } from './DistributionPeriod';
import { Proposal } from './Proposal';

/**
 * Class used to iteract with grants fund contract.
 */
export class GrantFund extends ContractBase implements IGrantFund {
  constructor(signerOrProvider: SignerOrProvider) {
    super(signerOrProvider);
  }

  /**
   * Delegates vote to the given delegatee
   * @param signer vote delegator
   * @param delegatee address of the delegateee
   * @returns transaction
   */
  async delegateVote(signer: Signer, delegatee: Address) {
    return await delegateVote(signer, delegatee);
  }

  /**
   * Det the address account is currently delegating to
   * @param address delegator
   * @returns address
   */
  async getDelegates(address: Address) {
    return await getDelegates(this.getProvider(), address);
  }

  /**
   * Retrieve a bytes32 hash of the current distribution period stage.
   */
  async getStage() {
    return await getStageContract(this.getProvider());
  }

  /**
   * Check if current distribution period is on screening stage
   * @returns boolean, is true when current distribution period is on screening stage
   */
  async isDistributionPeriodOnScreeningStage() {
    const distributionPeriodStage = await this.getStage();
    const screening = await utils.keccak256(SCREENING_STAGE);
    return distributionPeriodStage === screening;
  }

  /**
   * Get the voter's voting power in the screening stage of a distribution period
   * @param distributionId the distributionId of the distribution period to check
   * @param address the address of the voter to check
   * @returns the voter's voting power
   */
  async getVotesScreening(distributionId: number, address: Address) {
    return await getVotesScreeningContract(this.getProvider(), distributionId, address);
  }

  /**
   * Get the remaining quadratic voting power available to the voter in the funding stage of a distribution period
   * @param distributionId the distributionId of the distribution period to check
   * @param address the address of the voter to check
   * @returns the voter's remaining quadratic voting power
   */
  async getVotesFunding(distributionId: number, address: Address) {
    return await getVotesFundingContract(this.getProvider(), distributionId, address);
  }

  /**
   * Get the voter's voting power based on current distribution period stage
   * @param address the address of the voter to check
   * @returns the voter's voting power
   */
  async getVotingPower(address: Address) {
    const distributionPeriodId = await getCurrentDistributionId(this.getProvider());
    const isDistributionPeriodOnScreeningStage = await this.isDistributionPeriodOnScreeningStage();
    if (isDistributionPeriodOnScreeningStage) {
      return await this.getVotesScreening(distributionPeriodId, address);
    } else {
      return await this.getVotesFunding(distributionPeriodId, address);
    }
  }

  /**
   * Get the current state of a given voter in the funding stage.
   * @param  distributionId the distributionId of the distribution period to check.
   * @param  address        the address of the voter to check.
   * @return votingPower          The voter's voting power in the funding round. Equal to the square of their tokens in the voting snapshot.
   * @return remainingVotingPower The voter's remaining quadratic voting power in the given distribution period's funding round.
   * @return votesCast            The voter's number of proposals voted on in the funding stage.
   */
  async getVoterInfo(distributionId: number, address: Address) {
    return await getVoterInfo(this.getProvider(), distributionId, address);
  }

  /**
   * Get the number of screening votes cast by an account in a given distribution period.
   * @param  distributionId The distributionId of the distribution period to check.
   * @param  account The address of the voter to check.
   * @return The number of screening votes successfully cast the voter.
   */
  async getScreeningVotesCast(distributionId: number, address: Address) {
    return await getScreeningVotesCast(this.getProvider(), distributionId, address);
  }

  /**
   * Get the list of funding votes cast by an account in a given distribution period.
   * @param  distributionId_   The distributionId of the distribution period to check.
   * @param  account_          The address of the voter to check.
   * @return FundingVoteParams The list of FundingVoteParams structs that have been successfully cast the voter.
   */
  async getFundingVotesCast(distributionId: number, address: Address) {
    return await getFundingVotesCast(this.getProvider(), distributionId, address);
  }

  /**
   * Cast an array of screening votes in one transaction.
   * @param signer voter
   * @param votes The array of votes on proposals to cast.
   * @return votesCast The total number of votes cast across all of the proposals.
   */
  async screeningVote(signer: Signer, votes: VoteParams[]) {
    return await screeningVote(signer, votes);
  }

  /**
   * Cast an array of funding votes in one transaction.
   * @param signer voter
   * @param votes The array of votes on proposals to cast.
   * @return votesCast The total number of votes cast across all of the proposals.
   */
  async fundingVote(signer: Signer, votes: VoteParams[]) {
    return await fundingVote(signer, votes);
  }

  /**
   * Cast an array of screening or funding votes (based on current distribution period stage).
   * @param signer voter
   * @param votes the array of votes on proposals to cast.
   * @returns votesCast The total number of votes cast across all of the proposals.
   */
  async castVotes(signer: Signer, votes: VoteParams[]) {
    const isDistributionPeriodOnScreeningStage = await this.isDistributionPeriodOnScreeningStage();
    if (isDistributionPeriodOnScreeningStage) {
      return await screeningVote(signer, votes);
    } else {
      return await fundingVote(signer, votes);
    }
  }

  /**
   * starts a new distribution period, ensuring the treasury is funded
   * @param signer transaction signer
   * @returns transaction
   */
  async startNewDistributionPeriod(signer: Signer) {
    if ((await getTreasury(signer)).isZero()) {
      throw new SdkError('Unfunded treasury');
    }
    return startNewDistributionPeriod(signer);
  }

  /**
   * gets the current treasury balance
   * @returns BigNumber
   */
  async getTreasury() {
    return getTreasury(this.getProvider());
  }

  /**
   * gets details of the distribution period
   * @param signer caller
   * @param distributionId id of the distrituion period
   * @returns DistributionPeriod
   */
  async getDistributionPeriod(distributionId: number) {
    const provider = this.getProvider() as Provider;
    const [
      _distributionId,
      startBlockNumber,
      endBlockNumber,
      fundsAvailable,
      fundingVotePowerCast,
    ] = await getDistributionPeriod(provider, distributionId);

    const [startBlock, endBlock] = await Promise.all([
      provider.getBlock(startBlockNumber),
      provider.getBlock(endBlockNumber),
    ]);
    const startDate = startBlock.timestamp * 1000;
    return new DistributionPeriod(
      provider,
      distributionId,
      endBlock === null,
      startBlockNumber,
      startDate,
      endBlockNumber,
      endBlock ? endBlock.timestamp : startDate + DISTRIBUTION_PERIOD_DURATION,
      fundsAvailable,
      fundingVotePowerCast
    );
  }

  /**
   * gets details of the currently active distribution period
   * @param signer caller
   * @returns DistributionPeriod
   */
  async getActiveDistributionPeriod() {
    const provider = this.getProvider() as Provider;
    const distributionId = await getCurrentDistributionId(provider);
    if (distributionId === 0) {
      throw new SdkError('There is no active distribution period');
    }
    const currentDistributionPeriod = await this.getDistributionPeriod(distributionId);
    if (!currentDistributionPeriod.isActive) {
      throw new SdkError('There is no active distribution period');
    }
    return currentDistributionPeriod;
  }

  /**
   * creates a proposal in the current distribution period
   * @param signer caller
   * @param params ProposalParams object
   * @returns transaction
   */
  async createProposal(signer: Signer, params: ProposalParams): Promise<WrappedTransaction> {
    return createProposal(signer, params);
  }

  /**
   * gets a proposal object with the given proposalId
   * @param proposalId BigNumber
   * @returns Proposal object
   */
  getProposal(proposalId: BigNumber): Proposal {
    return new Proposal(this.getProvider(), proposalId);
  }
}
