import { SdkError } from '../types';

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
