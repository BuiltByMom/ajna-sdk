import { getProposalInfo } from '../contracts/grant-fund';
import { IProposal, SignerOrProvider } from 'types';

/**
 * models a grants fund proposal
 */
export class Proposal implements IProposal {
  provider: SignerOrProvider;
  id: string;
  constructor(provider: SignerOrProvider, id: string) {
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
}
