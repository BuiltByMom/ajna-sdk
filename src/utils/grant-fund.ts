import { BigNumber } from 'ethers';
import { ProposalInfo, ProposalInfoArray, SdkError } from '../types';
import { fromWad, toWad, wdiv, wmul } from './numeric';

type Votes = [proposalId: string, votesUsed: string];
type FormattedVotes = [proposalId: string, votesUsed: BigNumber];

/**
 * Scale the votes to use the full voting power based on a set of votes provided
 * @param {BigNumber} votingPower Voting power
 * @param {Array<Votes>} votes Array of proposalIds and vote used
 * @returns {Array<Votes>} Array of proposalIds and new votes calculated
 */
export const optimize = (votingPower: BigNumber, votes: Array<Votes>): Array<Votes> => {
  let currentVotes = toWad('0');
  // Format votes to WADs representations
  const formattedVotes: Array<FormattedVotes> = votes.map(([id, vote]) => {
    return [id, toWad(vote)];
  });

  // Sum absolute value of votes
  formattedVotes.forEach(([, vote]) => {
    currentVotes = currentVotes.add(vote.abs());
  });

  if (currentVotes.eq(0)) {
    throw new SdkError('Constraint not satisfied: all votes are 0');
  }

  // Calculates the scale factor of the votes based on voting power and sum of votes
  const scaleFactor = wdiv(votingPower, currentVotes);

  // Calculates new votes and format votes again to a string for UI usage
  const result: Array<Votes> = formattedVotes.map(([id, vote]) => {
    const scaledVote = wmul(vote, scaleFactor);
    return [id, fromWad(scaledVote)];
  });

  return result;
};

export function findBestProposals(
  proposals: Array<ProposalInfo>,
  tokensAvailable: number
): Array<ProposalInfo> {
  if (!proposals || proposals.length === 0) return [];
  // 90% of tokens available should be considered for this calculation
  const tokensAvailableToTake = (tokensAvailable * 9) / 10;

  // Function to generate all combinations of proposals
  function* generateCombinations(
    arr: Array<ProposalInfo>,
    start: number,
    len: number
  ): IterableIterator<Array<ProposalInfo>> {
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

  let bestCombo: Array<ProposalInfo> = [];
  let bestVotes = 0;

  // Check combinations of 1 proposal, 2 proposals...
  for (let len = 1; len <= proposals.length; len++) {
    for (const combo of generateCombinations(proposals, 0, len)) {
      const totalVotes = combo.reduce(
        (sum, proposal) => sum + Number(fromWad(proposal.votesReceived)),
        0
      );
      const totalTokens = combo.reduce(
        (sum, proposal) => sum + Number(fromWad(proposal.tokensRequested)),
        0
      );

      if (totalTokens <= tokensAvailableToTake && totalVotes > bestVotes) {
        bestVotes = totalVotes;
        bestCombo = combo;
      }
    }
  }

  return bestCombo;
}

export const formatProposalInfo = (proposalInfo: ProposalInfoArray): ProposalInfo => {
  return {
    proposalId: proposalInfo[0],
    votesReceived: proposalInfo[2],
    tokensRequested: proposalInfo[3],
  };
};
