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
   * gets details of the currently active distribution period
   * @param signer caller
   * @returns DistributionPeriod
   */
  async getActiveDistributionPeriod(signer: Signer) {
    const distributionId = await getActiveDistributionId(signer);
    if (distributionId === 0) {
      throw new SdkError('There is no active distribution cycle');
    }
    const [
      _distributionId,
      startBlock,
      endBlock,
      fundsAvailable,
      fundingVotePowerCast,
      _fundedSlateCast,
    ] = await getDistributionPeriod(signer, distributionId);
    return {
      id: distributionId,
      isActive: true,
      startBlock,
      startDate: 0, // to be determined
      endBlock,
      endDate: 0, // to be determined
      blockNumber: startBlock,
      fundsAvailable,
      proposalCount: 0, // to be determined
      votesCount: fundingVotePowerCast,
    };
  }

  /**
   * starts a new distribution period if none exists
   * @param signer caller
   * @returns transaction
   */
  async startNewDistributionPeriod(signer: Signer) {
    return await startNewDistributionPeriod(signer);
  }
}
