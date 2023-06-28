import { Provider } from '@ethersproject/providers';
import {
  delegateVote,
  getVotingPower,
  getActiveDistributionId,
  startNewDistributionPeriod,
  getDistributionPeriod,
} from '../contracts/grant-fund';
import { Address, IGrantFund, SdkError, SignerOrProvider } from '../types';
import { ContractBase } from './ContractBase';
import { Signer } from 'ethers';
import { DISTRIBUTION_PERIOD_DURATION } from '../constants/common';
/**
 * Class used to iteract with grants fund contract.
 */
export class GrantFund extends ContractBase implements IGrantFund {
  constructor(signerOrProvider: SignerOrProvider) {
    super(signerOrProvider);
  }

  /**
   * delegates vote to the given delegatee
   * @param signer vote delegator
   * @param delegatee address of the delegateee
   * @returns transaction
   */
  async delegateVote(signer: Signer, delegatee: Address) {
    return await delegateVote(signer, delegatee);
  }

  /**
   * gets voting power of a given address, defaults to voting power of provider address if not given
   * @param signer caller
   * @param address address of the voter
   * @returns BigNumber
   */
  async getVotingPower(signer: Signer, address?: string) {
    return await getVotingPower(signer, address ?? (await signer.getAddress()));
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
    return {
      id: distributionId,
      isActive: endBlock === null,
      startBlock: startBlockNumber,
      startDate,
      endBlock: endBlockNumber,
      endDate: endBlock ? endBlock.timestamp : startDate + DISTRIBUTION_PERIOD_DURATION,
      blockNumber: startBlockNumber,
      fundsAvailable,
      votesCount: fundingVotePowerCast,
    };
  }

  /**
   * gets details of the currently active distribution period
   * @param signer caller
   * @returns DistributionPeriod
   */
  async getActiveDistributionPeriod() {
    const distributionId = await getActiveDistributionId(this.getProvider());
    if (distributionId === 0) {
      throw new SdkError('There is no active distribution period');
    }
    return await this.getDistributionPeriod(distributionId);
  }

  /**
   * starts a new distribution period if none exists
   * @param signer caller
   * @returns transaction
   */
  static async startNewDistributionPeriod(signer: Signer) {
    return await startNewDistributionPeriod(signer);
  }
}
