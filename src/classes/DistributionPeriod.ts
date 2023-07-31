import { BigNumber, Signer } from 'ethers';
import { FINALIZE, FUNDING, FUNDING_STAGE, SCREENING, SCREENING_STAGE } from '../constants/common';
import {
  fundingVote,
  getFundingVotesCast,
  getScreeningVotesCast,
  getStage,
  getVoterInfo,
  getVotesFunding,
  getVotesScreening,
  screeningVote,
} from '../contracts/grant-fund';
import { Address, IDistributionPeriod, SdkError, SignerOrProvider, VoteParams } from '../types';
import { ContractBase } from './ContractBase';

/**
 * Class used to iteract with distribution periods.
 */
export class DistributionPeriod extends ContractBase implements IDistributionPeriod {
  id: number;
  isActive: boolean;
  startBlock: number;
  startDate: number;
  endBlock: number;
  endDate: number;
  fundsAvailable: BigNumber;
  votesCount: BigNumber;

  constructor(
    signerOrProvider: SignerOrProvider,
    id: number,
    isActive: boolean,
    startBlock: number,
    startDate: number,
    endBlock: number,
    endDate: number,
    fundsAvailable: BigNumber,
    votesCount: BigNumber
  ) {
    super(signerOrProvider);
    this.id = id;
    this.isActive = isActive;
    this.startBlock = startBlock;
    this.startDate = startDate;
    this.endBlock = endBlock;
    this.endDate = endDate;
    this.fundsAvailable = fundsAvailable;
    this.votesCount = votesCount;
  }

  /**
   * Retrieve a bytes32 hash of the current distribution period stage.
   */
  async getStage() {
    return await getStage(this.getProvider());
  }

  /**
   * Get current distribution period stage
   * @returns string, distribution period stage
   */
  async distributionPeriodStage() {
    const distributionPeriodStage = await this.getStage();
    switch (distributionPeriodStage) {
      case SCREENING_STAGE:
        return SCREENING;
      case FUNDING_STAGE:
        return FUNDING;
      default:
        return FINALIZE;
    }
  }

  /**
   * Get the voter's voting power in the screening stage of a distribution period
   * @param distributionId the distributionId of the distribution period to check
   * @param address the address of the voter to check
   * @returns the voter's voting power
   */
  async getScreeningVotingPower(address: Address) {
    return await getVotesScreening(this.getProvider(), this.id, address);
  }

  /**
   * Get the remaining quadratic voting power available to the voter in the funding stage of a distribution period
   * @param distributionId the distributionId of the distribution period to check
   * @param address the address of the voter to check
   * @returns the voter's remaining quadratic voting power
   */
  async getFundingVotingPower(address: Address) {
    return await getVotesFunding(this.getProvider(), this.id, address);
  }

  /**
   * Get the voter's voting power based on current distribution period stage
   * @param address the address of the voter to check
   * @returns the voter's voting power
   */
  async getVotingPower(address: Address) {
    const distributionPeriodStage = await this.distributionPeriodStage();
    if (distributionPeriodStage === SCREENING) {
      return await this.getScreeningVotingPower(address);
    } else if (distributionPeriodStage === FUNDING) {
      return await this.getFundingVotingPower(address);
    } else {
      throw new SdkError("Couldn't get voting power. Distribution Period is already finalized");
    }
  }

  /**
   * Get the current state of a given voter in the funding stage.
   * @param  distributionId the distributionId of the distribution period to check.
   * @param  address        the address of the voter to check.
   * @return {@link VoterInfo} * voter's voting information.
   */
  async getVoterInfo(address: Address) {
    return await getVoterInfo(this.getProvider(), this.id, address);
  }

  /**
   * Get the number of screening votes cast by an account in a given distribution period.
   * @param  distributionId The distributionId of the distribution period to check.
   * @param  account The address of the voter to check.
   * @return The number of screening votes successfully cast the voter.
   */
  async getScreeningVotesCast(address: Address) {
    return await getScreeningVotesCast(this.getProvider(), this.id, address);
  }

  /**
   * Get the list of funding votes cast by an account in a given distribution period.
   * @param  distributionId_   The distributionId of the distribution period to check.
   * @param  account_          The address of the voter to check.
   * @return FundingVoteParams The list of FundingVoteParams structs that have been successfully cast the voter.
   */
  async getFundingVotesCast(address: Address) {
    return await getFundingVotesCast(this.getProvider(), this.id, address);
  }
  /**
   * Cast an array of screening votes in one transaction.
   * @param signer voter
   * @param {@link VoteParams} * the array of votes on proposals to cast.
   * @return votesCast The total number of votes cast across all of the proposals.
   */
  async screeningVote(signer: Signer, votes: VoteParams[]) {
    return await screeningVote(signer, votes);
  }

  /**
   * Cast an array of funding votes in one transaction.
   * @param signer voter
   * @param {@link VoteParams} * the array of votes on proposals to cast.
   * @return votesCast The total number of votes cast across all of the proposals.
   */
  async fundingVote(signer: Signer, votes: VoteParams[]) {
    return await fundingVote(signer, votes);
  }

  /**
   * Cast an array of screening or funding votes (based on current distribution period stage).
   * @param signer voter
   * @param {@link VoteParams} * the array of votes on proposals to cast.
   * @returns votesCast The total number of votes cast across all of the proposals.
   */
  async castVotes(signer: Signer, votes: VoteParams[]) {
    const isDistributionPeriodOnScreeningStage =
      (await this.distributionPeriodStage()) === SCREENING;
    if (isDistributionPeriodOnScreeningStage) {
      return await screeningVote(signer, votes);
    } else {
      return await fundingVote(signer, votes);
    }
  }
}
