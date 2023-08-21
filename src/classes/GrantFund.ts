import { Provider } from '@ethersproject/providers';
import { BigNumber, Signer } from 'ethers';
import { DISTRIBUTION_PERIOD_DURATION } from '../constants/common';
import {
  claimDelegateReward,
  createProposal,
  delegateVote,
  executeProposal,
  getCurrentDistributionId,
  getDelegateReward,
  getDelegates,
  getDescriptionHash,
  getDistributionPeriod,
  getHasClaimedRewards,
  getTotalSupply,
  getTreasury,
  startNewDistributionPeriod,
} from '../contracts/grant-fund';
import {
  Address,
  ExecuteProposalParams,
  IGrantFund,
  ProposalParams,
  SdkError,
  SignerOrProvider,
  WrappedTransaction,
} from '../types';
import { ContractBase } from './ContractBase';
import { DistributionPeriod } from './DistributionPeriod';
import { Proposal } from './Proposal';
import { Config } from './Config';

/**
 * Class used to iteract with grants fund contract.
 */
export class GrantFund extends ContractBase implements IGrantFund {
  constructor(signerOrProvider: SignerOrProvider) {
    super(signerOrProvider);
  }

  /**
   * Get total token supply
   * @returns BigNumber
   */
  async getTotalSupply() {
    return getTotalSupply(this.getProvider());
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
   * Get the address account is currently delegating to
   * @param address delegator
   * @returns address
   */
  async getDelegates(address: Address) {
    return await getDelegates(this.getProvider(), address);
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
      fundedSlateHash,
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
      endBlock ? endBlock.timestamp * 1000 : startDate + DISTRIBUTION_PERIOD_DURATION,
      fundsAvailable,
      fundingVotePowerCast,
      fundedSlateHash
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
      return undefined;
    }
    const currentDistributionPeriod = await this.getDistributionPeriod(distributionId);
    if (!currentDistributionPeriod.isActive) {
      return undefined;
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

  /**
   * distributes delegate reward based on delegatee Vote share.
   * @param distributionId_ Id of distribution from which delegatee wants to claim their reward.
   * @return rewardClaimed_  amount of reward claimed by delegatee.
   */
  async claimDelegateReward(signer: Signer, distributionId: number): Promise<WrappedTransaction> {
    return await claimDelegateReward(signer, distributionId);
  }

  /**
   * retrieve the delegate reward accrued to a voter in a given distribution period.
   * @param  distributionId_ The distributionId to calculate rewards for.
   * @param  voter_ the address of the voter to calculate rewards for.
   * @return rewards_ the rewards earned by the voter for voting in that distribution period.
   */
  async getDelegateReward(distributionId: number, voter: Address): Promise<BigNumber> {
    return await getDelegateReward(this.getProvider(), distributionId, voter);
  }

  /**
   * get the reward claim status of an account in a given distribution period.
   * @param  distributionId_ The distributionId of the distribution period to check.
   * @param  voter_ the address of the voter to check.
   * @return rewards_ the reward claim status of the account in the distribution period.
   */
  async getHasClaimedRewards(distributionId: number, voter: Address): Promise<boolean> {
    return await getHasClaimedRewards(this.getProvider(), distributionId, voter);
  }

  /**
   * Execute a proposal that has been approved by the community. Only proposals in the finalized top slate slate at the end of the challenge period can be executed.
   * @param  targets_ list of contracts the proposal calldata will interact with. Should be the Ajna token contract for all proposals.
   * @param  values_ list of values to be sent with the proposal calldata. Should be 0 for all proposals.
   * @param  calldatas_ list of calldata to be executed. Should be the transfer() method.
   * @param  descriptionHash_ hash of proposal's description string.
   * @return proposalId_ the id of the executed proposal.
   */
  async executeProposal(signer: Signer, { params, description }: ExecuteProposalParams) {
    const descriptionHash = await getDescriptionHash(this.getProvider(), description);
    const targets = params.map(() => Config.ajnaToken);
    const values = params.map(() => 0);
    const calldata = params.map(({ calldata }) => calldata);
    return await executeProposal(signer, targets, values, calldata, descriptionHash);
  }
}
