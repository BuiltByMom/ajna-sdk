import { BigNumber } from 'ethers';
import {
  FormattedVoteParams,
  ProposalInfo,
  ProposalInfoArray,
  SdkError,
  VoteParams,
} from '../types';
import { fromWad, toWad } from './numeric';

type Votes = [proposalId: string, votesUsed: string];
type FormattedVotes = [proposalId: string, votesUsed: number];

export const optimize = (votingPower: string, votes: Votes[]): Votes[] => {
  let currentVotes = 0;
  // Format votes to be a number
  const formattedVotes: FormattedVotes[] = votes.map(vote => {
    return [vote[0], Number(vote[1])];
  });
  const formattedVotingPower = Number(votingPower);

  formattedVotes.forEach(vote => (currentVotes += Math.abs(vote[1])));

  if (currentVotes === 0) {
    throw new SdkError('Constraint not satisfied: all votes are 0');
  }

  const scaleFactor = formattedVotingPower / currentVotes;

  // Scale, and format votes again to a string for UI usage
  const result: Votes[] = formattedVotes.map(vote => {
    const scaledVote = vote[1] * scaleFactor;
    return [vote[0], scaledVote.toString()];
  });

  return result;
};

export function findBestProposals(
  proposals: ProposalInfo[],
  tokensAvailable: number
): ProposalInfo[] {
  if (!proposals || proposals.length === 0) return [];
  // 90% of tokens available should be considered for this calculation
  const tokensAvailableToTake = (tokensAvailable * 9) / 10;

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

export const formatVotes = async (
  vote: VoteParams,
  isDistributionPeriodOnScreeningStage: boolean
): Promise<FormattedVoteParams> => {
  if (isDistributionPeriodOnScreeningStage) {
    return [BigNumber.from(vote[0]), BigNumber.from(toWad(vote[1]))];
  } else {
    const voteRoot =
      Number(vote[1]) < 0
        ? toWad(-Math.sqrt(Math.abs(Number(vote[1]))))
        : toWad(Math.sqrt(Number(vote[1])));
    return [BigNumber.from(vote[0]), BigNumber.from(voteRoot)];
  }
};
