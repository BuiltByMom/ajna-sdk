import { delegateVote, getVotingPower } from '../contracts/grant-fund';
import { Address, IGrantFund, SignerOrProvider } from '../types';
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
}
