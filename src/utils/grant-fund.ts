import { BigNumber } from 'ethers';
import {
  FormattedVoteParams,
  ProposalInfo,
  ProposalInfoArray,
  SdkError,
  VoteParams,
} from '../types';
import { fromWad, toWad, wsqrt, wdiv, wmul } from './numeric';

type Votes = [proposalId: string, votesUsed: string];
type FormattedVotes = [proposalId: string, votesUsed: BigNumber];

export const optimize = (votingPower: BigNumber, votes: Votes[]): Votes[] => {
  let currentVotes = toWad('0');
  const formattedVotes: FormattedVotes[] = votes.map(([id, vote]) => {
    return [id, toWad(vote)];
  });

  formattedVotes.forEach(([, vote]) => {
    if (vote.lt(0)) {
      currentVotes = currentVotes.add(wmul(vote, toWad('-1')));
    } else {
      currentVotes = currentVotes.add(vote);
    }
  });

  if (currentVotes.eq(0)) {
    throw new SdkError('Constraint not satisfied: all votes are 0');
  }

  const scaleFactor = wdiv(votingPower, currentVotes);

  // Scale, and format votes again to a string for UI usage
  const result: Votes[] = formattedVotes.map(([id, vote]) => {
    const scaledVote = wmul(vote, scaleFactor);
    return [id, fromWad(scaledVote)];
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
  [proposalId, vote]: VoteParams,
  isDistributionPeriodOnScreeningStage: boolean
): Promise<FormattedVoteParams> => {
  if (isDistributionPeriodOnScreeningStage) {
    return [BigNumber.from(proposalId), BigNumber.from(toWad(vote))];
  } else {
    // Calculates square root of absolute value and multiplies by -1 if it was a negative vote before
    const voteRoot = Number(vote) < 0 ? wsqrt(toWad(vote).abs()).mul(-1) : wsqrt(toWad(vote));
    return [BigNumber.from(proposalId), BigNumber.from(voteRoot)];
  }
};
