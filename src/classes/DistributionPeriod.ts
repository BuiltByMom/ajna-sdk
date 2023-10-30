import { BigNumber, Signer } from 'ethers';
import { CHALLENGE_STAGE, FUNDING_STAGE, SCREENING_STAGE } from '../constants/common';
import {
  fundingVote,
  getFundedProposalSlate,
  getFundingVotesCast,
  getProposalInfo,
  getScreeningVotesCast,
  getStage,
  getTopTenProposals,
  getVoterInfo,
  getVotesFunding,
  getVotesScreening,
  screeningVote,
  updateSlate,
} from '../contracts/grant-fund';
import {
  Address,
  DistributionPeriodStage,
  FormattedVoteParams,
  FundingVotes,
  IDistributionPeriod,
  ProposalInfo,
  SdkError,
  SignerOrProvider,
  VoteParams,
  VoterInfo,
  WrappedTransaction,
} from '../types';
import { fromWad, toWad, wsqrt } from '../utils';
import { findBestProposals, formatProposalInfo } from '../utils/grant-fund';
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
  fundedSlateHash: string;

  constructor(
    signerOrProvider: SignerOrProvider,
    id: number,
    isActive: boolean,
    startBlock: number,
    startDate: number,
    endBlock: number,
    endDate: number,
    fundsAvailable: BigNumber,
    votesCount: BigNumber,
    fundedSlateHash: string
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
    this.fundedSlateHash = fundedSlateHash;
  }

  toString() {
    return `distribution period #${this.id}
is active: ${this.isActive ? 'yes' : 'no'}
start block: ${this.startBlock}
start date: ${new Date(this.startDate)}
end block: ${this.endBlock}
end date: ${new Date(this.endDate)}
funds available: ${fromWad(this.fundsAvailable)}
votes count: ${fromWad(this.votesCount)}
funded slate hash: ${fromWad(this.fundedSlateHash)}
`;
  }

  /**
   * Retrieve a bytes32 hash of the current distribution period stage.
   */
  async getStage(): Promise<string> {
    return await getStage(this.getProvider());
  }

  /**
   * Get current distribution period stage.
   * @returns string, distribution period stage
   */
  async distributionPeriodStage(): Promise<DistributionPeriodStage> {
    const distributionPeriodStage = await this.getStage();
    switch (distributionPeriodStage) {
      case SCREENING_STAGE:
        return DistributionPeriodStage.SCREENING;
      case FUNDING_STAGE:
        return DistributionPeriodStage.FUNDING;
      case CHALLENGE_STAGE:
        return DistributionPeriodStage.CHALLENGE;
      default:
        return DistributionPeriodStage.FINALIZE;
    }
  }

  /**
   * Get the voter's voting power in the screening stage of a distribution period.
   * @param distributionId the distributionId of the distribution period to check
   * @param address the address of the voter to check
   * @returns the voter's voting power
   */
  async getScreeningVotingPower(address: Address): Promise<BigNumber> {
    return await getVotesScreening(this.getProvider(), this.id, address);
  }

  /**
   * Get the remaining quadratic voting power available to the voter in the funding stage of a distribution period.
   * @param distributionId the distributionId of the distribution period to check
   * @param address the address of the voter to check
   * @returns the voter's remaining quadratic voting power
   */
  async getFundingVotingPower(address: Address): Promise<BigNumber> {
    return await getVotesFunding(this.getProvider(), this.id, address);
  }

  /**
   * Get the voter's voting power based on current distribution period stage.
   * @param address the address of the voter to check
   * @returns the voter's voting power
   */
  async getVotingPower(address: Address): Promise<BigNumber> {
    const distributionPeriodStage = await this.distributionPeriodStage();
    if (distributionPeriodStage === DistributionPeriodStage.SCREENING) {
      const initialVotingPower = await this.getScreeningVotingPower(address);
      const votingPowerUsed = await this.getScreeningVotesCast(address);
      const remainingVotingPower = BigNumber.from(initialVotingPower).sub(votingPowerUsed);
      return remainingVotingPower;
    } else if (distributionPeriodStage === DistributionPeriodStage.FUNDING) {
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
  async getVoterInfo(address: Address): Promise<VoterInfo> {
    return await getVoterInfo(this.getProvider(), this.id, address);
  }

  /**
   * Get the number of screening votes cast by an account in a given distribution period.
   * @param  distributionId The distributionId of the distribution period to check.
   * @param  account The address of the voter to check.
   * @return The number of screening votes successfully cast the voter.
   */
  async getScreeningVotesCast(address: Address): Promise<BigNumber> {
    return await getScreeningVotesCast(this.getProvider(), this.id, address);
  }

  /**
   * Get the list of funding votes cast by an account in a given distribution period.
   * @param  distributionId_   The distributionId of the distribution period to check.
   * @param  account_          The address of the voter to check.
   * @return FundingVoteParams The list of FundingVoteParams structs that have been successfully cast the voter.
   */
  async getFundingVotesCast(address: Address): Promise<Array<FundingVotes>> {
    return await getFundingVotesCast(this.getProvider(), this.id, address);
  }
  /**
   * Cast an array of screening votes in one transaction.
   * @param signer voter
   * @param {@link VoteParams} * the array of votes on proposals to cast.
   * @return promise to transaction
   */
  async screeningVote(
    signer: Signer,
    votes: Array<FormattedVoteParams>
  ): Promise<WrappedTransaction> {
    return screeningVote(signer, votes);
  }

  /**
   * Cast an array of funding votes in one transaction.
   * @param signer voter
   * @param {@link VoteParams} * the array of votes on proposals to cast.
   * @return promise to transaction
   */
  async fundingVote(
    signer: Signer,
    votes: Array<FormattedVoteParams>
  ): Promise<WrappedTransaction> {
    return fundingVote(signer, votes);
  }

  /**
   * Cast an array of screening or funding votes (based on current distribution period stage).
   * @param signer voter
   * @param {@link VoteParams} * the array of votes on proposals to cast.
   * @returns promise to transaction
   */
  async castVotes(signer: Signer, votes: Array<VoteParams>): Promise<WrappedTransaction> {
    const distributionPeriodStage = await this.distributionPeriodStage();
    const isDistributionPeriodOnScreeningStage =
      distributionPeriodStage === DistributionPeriodStage.SCREENING;

    // Format to what's expected by the contract.
    const formattedVotes = await Promise.all(
      votes.map<FormattedVoteParams>(([proposalId, vote]) => {
        if (isDistributionPeriodOnScreeningStage) {
          return [BigNumber.from(proposalId), BigNumber.from(toWad(vote))];
        } else {
          // Calculates square root of absolute value and multiplies by -1 if it was a negative vote before
          const voteRoot = Number(vote) < 0 ? wsqrt(toWad(vote).abs()).mul(-1) : wsqrt(toWad(vote));
          return [BigNumber.from(proposalId), BigNumber.from(voteRoot)];
        }
      })
    );

    if (isDistributionPeriodOnScreeningStage) {
      return screeningVote(signer, formattedVotes);
    } else {
      return fundingVote(signer, formattedVotes);
    }
  }

  /**
   * Get top ten proposals on funding stage.
   * @param distributionId the distributionId of the distribution period to check
   * @returns top ten proposals on funding stage
   */
  async getTopTenProposals(): Promise<Array<string>> {
    const toTenProposals = await getTopTenProposals(this.getProvider(), this.id);
    const formattedToTenProposals = toTenProposals.map(id => id.toString());
    return formattedToTenProposals;
  }

  /**
   * Check if a slate of proposals meets requirements, and maximizes votes. If so, set the provided proposal slate as the new top slate of proposals.
   * @param proposals Array of proposals to check.
   * @returns promise to transaction
   */
  async updateSlate(signer: Signer, proposals: Array<string>): Promise<WrappedTransaction> {
    const proposalsIds = proposals.map(proposalId => BigNumber.from(proposalId));
    return updateSlate(signer, proposalsIds, this.id);
  }

  /**
   * Get the funded proposal slate for a given distributionId, and slate hash.
   * @returns The array of proposalIds that are in the funded slate hash.
   */
  async getFundedProposalSlate(): Promise<Array<string>> {
    const proposals = await getFundedProposalSlate(this.getProvider(), this.fundedSlateHash);

    const proposalIds = proposals.map(id => id.toString());

    return proposalIds;
  }

  /**
   * Get best proposals based on the combination of votes received and tokens requested over tokens available.
   * @param tokensAvailable treasury.
   * @returns proposals[] a new slate of proposals
   */
  async getOptimalProposals(
    proposalIds: Array<string>,
    tokensAvailable: BigNumber
  ): Promise<Array<string>> {
    let bestProposals: Array<ProposalInfo>;
    let proposals: Array<ProposalInfo> = [];

    const getEachProposalInfo = async (proposalId: string): Promise<ProposalInfo> => {
      const proposalInfo = await getProposalInfo(this.getProvider(), BigNumber.from(proposalId));
      return formatProposalInfo(proposalInfo);
    };

    proposals = await Promise.all(proposalIds.map(getEachProposalInfo));

    if (proposals.length > 0) {
      bestProposals = findBestProposals(proposals, Number(fromWad(tokensAvailable)));
    } else {
      throw new SdkError('There is no funded proposal slate');
    }

    const optimalProposalsIds = bestProposals.flatMap(proposal => proposal.proposalId.toString());

    return optimalProposalsIds;
  }
}
