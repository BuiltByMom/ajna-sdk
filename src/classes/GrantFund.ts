import {
  delegateVote,
  getDelegates,
  getGrantsFundContract,
  getTreasury,
  getVotesFunding,
  getVotesScreening,
  startNewDistributionPeriod,
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
   * get the address account is currently delegating to
   * @param address delegator
   * @returns address
   */
  async getDelegates(address: Address) {
    return await getDelegates(this.getProvider(), address);
  }

  /**
   * get the remaining quadratic voting power available to the voter in the funding stage of a distribution period
   * @param distributionId the distributionId of the distribution period to check
   * @param address the address of the voter to check
   * @returns the voter's remaining quadratic voting power
   */
  async getVotesFunding(distributionId: number, address: Address) {
    const contractInstance = getGrantsFundContract(this.getProvider());
    return await getVotesFunding(contractInstance, distributionId, address);
  }

  /**
   * get the voter's voting power in the screening stage of a distribution period
   * @param distributionId the distributionId of the distribution period to check
   * @param address the address of the voter to check
   * @returns the voter's voting power
   */
  async getVotesScreening(distributionId: number, address: Address) {
    const contractInstance = getGrantsFundContract(this.getProvider());
    return await getVotesScreening(contractInstance, distributionId, address);
  }

  async startNewDistributionPeriod(signer: Signer) {
    if ((await getTreasury(signer)).isZero()) {
      throw new SdkError('Unfunded treasury');
    }
    return startNewDistributionPeriod(signer);
  }
}
