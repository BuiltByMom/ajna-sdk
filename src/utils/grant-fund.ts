import { ProposalInfo, ProposalInfoArray, SdkError } from '../types';

type Votes = [proposalId: string, votesUsed: number];

export const optimize = (votingPower: number, votes: Votes[]): Votes[] => {
  let currentVotes = 0;
  const result = votes;
  for (let i = 0; i < votes.length; ++i) {
    const vote = votes[i][1];
    if (vote > 0) {
      currentVotes += votes[i][1];
    }
  }
  if (currentVotes === 0) {
    throw new SdkError('Constraint not satisfied: all votes are 0');
  }
  const scaleFactor = votingPower / currentVotes;
  for (let i = 0; i < votes.length; ++i) {
    result[i][1] *= scaleFactor;
  }
  return result;
};

export function findBestProposals(
  proposals: ProposalInfo[],
  tokensAvailable: number
): ProposalInfo[] {
  if (!proposals || proposals.length === 0) return [];

  // Function to generate all combinations of proposals
  function* generateCombinations(
    arr: ProposalInfo[],
    start: number,
    len: number
  ): IterableIterator<ProposalInfo[]> {
    if (len === 0) {
      yield [];
      return;
    }
    if (start === arr.length) return;
    for (let i = start; i <= arr.length - len; i++) {
      const head = arr.slice(i, i + 1);
      const tailCombinations = generateCombinations(arr, i + 1, len - 1);
      for (const tail of tailCombinations) {
        yield head.concat(tail);
      }
    }
  }

  let bestCombo: ProposalInfo[] = [];
  let bestVotes = 0;

  // Check combinations of 1 proposal, 2 proposals...
  for (let len = 1; len <= proposals.length; len++) {
    for (const combo of generateCombinations(proposals, 0, len)) {
      const totalVotes = combo.reduce(
        (sum, proposal) => sum + proposal.votesReceived.toNumber(),
        0
      );
      const totalTokens = combo.reduce(
        (sum, proposal) => sum + proposal.tokensRequested.toNumber(),
        0
      );

      if (totalTokens <= tokensAvailable && totalVotes > bestVotes) {
        bestVotes = totalVotes;
        bestCombo = combo;
      }
    }
  }

  return bestCombo;
}

export const formatProposalInfo = (proposalInfo: ProposalInfoArray) => {
  return {
    proposalId: proposalInfo[0],
    votesReceived: proposalInfo[2],
    tokensRequested: proposalInfo[3],
  };
};
