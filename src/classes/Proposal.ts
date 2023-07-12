import { BigNumber } from 'ethers';
import { getProposalInfo, getProposalState } from '../contracts/grant-fund';
import { IProposal, proposalStates, SignerOrProvider } from '../types';

/**
 * models a grants fund proposal
 */
export class Proposal implements IProposal {
  provider: SignerOrProvider;
  id: BigNumber;
  constructor(provider: SignerOrProvider, id: BigNumber) {
    this.provider = provider;
    this.id = id;
  }

  async getInfo() {
    const [
      proposalId,
      distributionId,
      votesReceived,
      tokensRequested,
      fundingVotesReceived,
      executed,
    ] = await getProposalInfo(this.provider, this.id);
    return {
      proposalId,
      distributionId,
      votesReceived,
      tokensRequested,
      fundingVotesReceived,
      executed,
    };
  }

  async getState() {
    const index = await getProposalState(this.provider, this.id);
    return proposalStates[index];
  }
}
