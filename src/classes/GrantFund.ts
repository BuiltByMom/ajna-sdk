import { Provider } from '@ethersproject/providers';
import { BigNumber, Signer } from 'ethers';
import { DISTRIBUTION_PERIOD_DURATION } from '../constants/common';
import {
  createProposal,
  delegateVote,
  getCurrentDistributionId,
  getDelegates,
  getDistributionPeriod,
  getTotalSupply,
  getTreasury,
  startNewDistributionPeriod,
} from '../contracts/grant-fund';
import {
  Address,
  IGrantFund,
  ProposalParams,
  SdkError,
  SignerOrProvider,
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
      fundedSlateHash,
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
      endBlock ? endBlock.timestamp * 1000 : startDate + DISTRIBUTION_PERIOD_DURATION,
      fundedSlateHash,
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
}
