import { Provider } from '@ethersproject/providers';
import {
  getActiveDistributionId,
  getDistributionPeriod,
} from '../contracts/grant-fund';
import {, IDistributionPeriod, SdkError, SignerOrProvider } from '../types';
import { ContractBase } from './ContractBase';

import { DISTRIBUTION_PERIOD_DURATION } from '../constants/common';
/**
 * Class used to iteract with distribution periods.
 */
export class DistributionPeriod extends ContractBase implements IDistributionPeriod {
  constructor(signerOrProvider: SignerOrProvider) {
    super(signerOrProvider);
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
}
