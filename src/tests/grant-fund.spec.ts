import { expect } from '@jest/globals';
import { BigNumber, providers } from 'ethers';
import { AjnaSDK } from '../classes/AjnaSDK';
import { DistributionPeriod } from '../classes/DistributionPeriod';
import { getProposalIdFromReceipt, startNewDistributionPeriod } from '../contracts/grant-fund';
import { addAccountFromKey } from '../utils/add-account';
import { mine } from '../utils/ganache';
import { findBestProposals, optimize } from '../utils/grant-fund';
import { fromWad } from '../utils/numeric';
import { TEST_CONFIG as config } from './test-constants';
import { submitAndVerifyTransaction } from './test-utils';
import { DistributionPeriodStage } from '../types/classes';

jest.setTimeout(1200000);

const SIGNER_KEY = '0x2bbf23876aee0b3acd1502986da13a0f714c143fcc8ede8e2821782d75033ad1';

const VOTER_ADDRESS = '0xeeDC2EE00730314b7d7ddBf7d19e81FB7E5176CA';
const VOTER_KEY = '0xd332a346e8211513373b7ddcf94b2b513b934b901258a9465c76d0d9a2b676d8';
const PROPOSAL_TO_ADDRESS = '0xbC33716Bb8Dc2943C0dFFdE1F0A1d2D66F33515E';

describe('Grants fund', () => {
  const provider = new providers.JsonRpcProvider(config.ETH_RPC_URL);
  const ajna = new AjnaSDK(provider);
  const signer = addAccountFromKey(SIGNER_KEY, provider);
  const voter = addAccountFromKey(VOTER_KEY, provider);

  let distributionPeriod: DistributionPeriod;
  let proposalId: BigNumber;
  let proposalId2: BigNumber;

  beforeAll(async () => {
    // mine blocks until no distribution period is active
    const DISTRIBUTION_PERIOD_LENGTH = 648_000;
    await mine(provider, DISTRIBUTION_PERIOD_LENGTH);
  });

  describe('Delegates', () => {
    it('should delegate successfully', async () => {
      // delegate before distribution period starts
      const delegate = await ajna.grants.delegateVote(voter, VOTER_ADDRESS);
      expect(delegate).toBeDefined();
      const transaction = await delegate.verifyAndSubmit();
      expect(transaction.from).toBe(VOTER_ADDRESS);
      expect(transaction.to).toBe('0x25Af17eF4E2E6A4A2CE586C9D25dF87FD84D4a7d');
      expect(transaction.status).toBe(1);
    });

    it('should get delegate', async () => {
      const delegate = await ajna.grants.getDelegates(VOTER_ADDRESS);
      expect(delegate).toBeDefined();
      expect(delegate).toBe(VOTER_ADDRESS);
    });
  });

  describe('Distribution Period', () => {
    it(`should return undefined if distribution period doesn't exist`, async () => {
      expect(await ajna.grants.getActiveDistributionPeriod()).toBeUndefined();
    });

    it('start new distribution period', async () => {
      await mine(provider, 34);
      // start new distribution period
      const tx = await startNewDistributionPeriod(signer);
      const transaction = await tx.verifyAndSubmit();
      await mine(provider, 2);
      expect(transaction.status).toBe(1);
    });

    it(`fails to start a new distribution period if an active one already exists`, async () => {
      const tx = await startNewDistributionPeriod(signer);
      await expect(tx.verify()).rejects.toThrow('DistributionPeriodStillActive()');
    });

    it('should get the active distribution period', async () => {
      const dp = await ajna.grants.getActiveDistributionPeriod();
      expect(dp).toBeDefined();
      const votesCount = fromWad(dp?.votesCount || 0);
      const fundsAvailable = fromWad(dp?.fundsAvailable || 0);
      expect(dp?.id).toBe(2);
      expect(dp?.startBlock).toBeDefined();
      expect(dp?.endBlock).toBeDefined();
      expect(dp?.startDate).toBeDefined();
      expect(dp?.endDate).toBeDefined();
      expect(dp?.isActive).toBe(true);
      expect(votesCount).toBe('0.0');
      expect(fundsAvailable).toBe('0.0');
    });

    it('should get the distribution by id', async () => {
      const dp = await ajna.grants.getDistributionPeriod(2);
      expect(dp.id).toBe(2);
      expect(dp.startBlock).toBeDefined();
      expect(dp.endBlock).toBeDefined();
      expect(dp.startDate).toBeDefined();
      expect(dp.endDate).toBeDefined();
      expect(dp.isActive).toBe(true);
      expect(fromWad(dp.votesCount)).toBe('0.0');
      expect(fromWad(dp.fundsAvailable)).toBe('0.0');
    });
  });

  describe('Total supply', () => {
    it('should get total supply', async () => {
      const totalSupply = await ajna.grants.getTotalSupply();
      expect(fromWad(totalSupply)).toBeDefined();
    });
  });

  describe('Treasury', () => {
    it('gets the treasury balance', async () => {
      const treasury = await ajna.grants.getTreasury();
      expect(fromWad(treasury)).toBe('291000000.0');
    });
  });

  describe('Proposals', () => {
    it(`creates a new proposal`, async () => {
      const tx = await ajna.grants.createProposal(signer, {
        title: 'ajna proposal test',
        recipientAddresses: [
          {
            address: PROPOSAL_TO_ADDRESS,
            amount: '1000.00',
          },
        ],
        externalLink: 'https://example.com',
        ipfsHash: '000000001',
        arweaveTxid: '000000001',
      });
      const receipt = await submitAndVerifyTransaction(tx);
      proposalId = getProposalIdFromReceipt(receipt);
      const proposal = ajna.grants.getProposal(proposalId);
      const proposalInfo = await proposal.getInfo();
      expect(proposalInfo.votesReceived.isZero()).toBe(true);
      expect(fromWad(proposalInfo.tokensRequested)).toBe('1000.0');
      expect(proposalInfo.fundingVotesReceived.isZero()).toBe(true);
      expect(proposalInfo.executed).toBe(false);
    });

    it(`creates a new multi-recipient proposal`, async () => {
      const tx = await ajna.grants.createProposal(signer, {
        title: 'ajna proposal test',
        recipientAddresses: [
          {
            address: PROPOSAL_TO_ADDRESS,
            amount: '1000.00',
          },
          {
            address: PROPOSAL_TO_ADDRESS,
            amount: '2000.00',
          },
        ],
        externalLink: 'https://example.com',
        ipfsHash: '000000001',
        arweaveTxid: '000000001',
      });
      const receipt = await submitAndVerifyTransaction(tx);
      const proposalId = getProposalIdFromReceipt(receipt);
      const proposal = ajna.grants.getProposal(proposalId);
      const proposalInfo = await proposal.getInfo();
      expect(proposalInfo.votesReceived.isZero()).toBe(true);
      expect(fromWad(proposalInfo.tokensRequested)).toBe('3000.0');
      expect(proposalInfo.fundingVotesReceived.isZero()).toBe(true);
      expect(proposalInfo.executed).toBe(false);
    });
  });

  describe('Voting', () => {
    it('distribution period should be on screening stage', async () => {
      const currentDistributionPeriod = await ajna.grants.getActiveDistributionPeriod();
      if (currentDistributionPeriod) {
        distributionPeriod = await ajna.grants.getDistributionPeriod(currentDistributionPeriod.id);
      }
      const isOnScreeningStage =
        (await distributionPeriod.distributionPeriodStage()) === DistributionPeriodStage.SCREENING;
      expect(isOnScreeningStage).toBe(true);
    });

    it('should get votes screening', async () => {
      const votes = await distributionPeriod.getScreeningVotingPower(VOTER_ADDRESS);
      expect(votes).toBeDefined();
      expect(fromWad(votes)).toBe('699825000.0');
    });

    it('should cast screening votes', async () => {
      let tx = await ajna.grants.createProposal(signer, {
        title: 'ajna proposal test 1',
        recipientAddresses: [
          {
            address: PROPOSAL_TO_ADDRESS,
            amount: '1100.00',
          },
        ],
        externalLink: 'https://example.com',
        ipfsHash: '000000001',
        arweaveTxid: '000000001',
      });
      let receipt = await submitAndVerifyTransaction(tx);
      proposalId = getProposalIdFromReceipt(receipt);
      tx = await ajna.grants.createProposal(signer, {
        title: 'ajna proposal test 2',
        recipientAddresses: [
          {
            address: PROPOSAL_TO_ADDRESS,
            amount: '102.00',
          },
        ],
        externalLink: 'https://example.com',
        ipfsHash: '000000001',
        arweaveTxid: '000000001',
      });
      receipt = await submitAndVerifyTransaction(tx);
      proposalId2 = getProposalIdFromReceipt(receipt);
      const castVotes = await distributionPeriod.castVotes(voter, [
        [proposalId.toString(), '1000.0'],
        [proposalId2.toString(), '1000.0'],
      ]);
      const transaction = await castVotes.verifyAndSubmit();
      expect(transaction.from).toBe(VOTER_ADDRESS);
      expect(transaction.status).toBe(1);
    });

    it('distribution period should be on funding stage', async () => {
      const SCREENING_PERIOD_LENGTH = 525_600;
      await mine(provider, SCREENING_PERIOD_LENGTH);
      const isOnFundingStage =
        (await distributionPeriod.distributionPeriodStage()) === DistributionPeriodStage.FUNDING;
      expect(isOnFundingStage).toBe(true);
    });

    it('should get votes funding', async () => {
      const votes = await distributionPeriod.getFundingVotingPower(VOTER_ADDRESS);
      expect(votes).toBeDefined();
      expect(fromWad(votes)).toBe('489755030625000000.0');
    });

    it('should get top ten proposals', async () => {
      const topTen = await distributionPeriod.getTopTenProposals();
      expect(topTen).toBeDefined();
      expect(topTen[0]).toBe(proposalId.toString());
      expect(topTen[1]).toBe(proposalId2.toString());
    });

    it('should cast funding votes', async () => {
      const castVotes = await distributionPeriod.castVotes(voter, [
        [proposalId.toString(), '4000000.0'],
        [proposalId2.toString(), '4000000.0'],
      ]);
      const transaction = await castVotes.verifyAndSubmit();
      expect(transaction.from).toBe(VOTER_ADDRESS);
      expect(transaction.status).toBe(1);
    });

    it('should get votes based on current distribution period stage', async () => {
      const votes = await distributionPeriod.getVotingPower(VOTER_ADDRESS);
      expect(votes).toBeDefined();
      expect(fromWad(votes)).toBe('489755030617000000.0');
    });

    it('should get cast votes', async () => {
      const screeningVotes = await distributionPeriod.getScreeningVotesCast(VOTER_ADDRESS);
      const fundingVotes = await distributionPeriod.getFundingVotesCast(VOTER_ADDRESS);
      expect(screeningVotes).toBeDefined();
      expect(fromWad(screeningVotes)).toBe('2000.0');
      expect(fundingVotes).toBeDefined();
      expect(fromWad(fundingVotes[0].votesUsed)).toBe('2000.0');
      expect(fromWad(fundingVotes[1].votesUsed)).toBe('2000.0');
    });

    it('should get voter info', async () => {
      const voterInfo = await distributionPeriod.getVoterInfo(VOTER_ADDRESS);
      expect(voterInfo).toBeDefined();
      expect(fromWad(voterInfo[0])).toBe('489755030625000000.0');
      expect(fromWad(voterInfo[1])).toBe('489755030617000000.0');
      expect(fromWad(voterInfo[2])).toBe('0.000000000000000002');
    });
    it('should update slate successfully', async () => {
      const FUNDING_PERIOD_LENGTH = 72_000;
      await mine(provider, FUNDING_PERIOD_LENGTH);
      const isOnChallengeStage =
        (await distributionPeriod.distributionPeriodStage()) === DistributionPeriodStage.CHALLENGE;
      expect(isOnChallengeStage).toBe(true);
      const newTopSlate = await distributionPeriod.updateSlate(voter, [
        proposalId.toString(),
        proposalId2.toString(),
      ]);
      const transaction = await newTopSlate.verifyAndSubmit();
      expect(transaction.status).toBe(1);
    });
    it('should get funded proposal slate', async () => {
      const proposalSlate = await distributionPeriod.getFundedProposalSlate();
      expect(proposalSlate).toBeDefined();
    });
  });
  describe('Optimized proposals', () => {
    describe('Optimize util', () => {
      it('should throw error when votes are equal to zero', () => {
        expect(async () =>
          optimize('100', [
            ['1', '0'],
            ['2', '0'],
          ])
        ).rejects.toThrowError('Constraint not satisfied: all votes are 0');
      });
      it('should rescale votes correctly', () => {
        const optimizedVotes = optimize('100', [
          ['1', '12'],
          ['2', '0'],
        ]);
        expect(optimizedVotes[0][1]).toBe('100');
        expect(optimizedVotes[1][1]).toBe('0');
        const resultSum = optimizedVotes.reduce((accumulator, vote) => {
          return accumulator + Number(vote[1]);
        }, 0);
        expect(resultSum).toBe(100);
      });
      it('should work as expected when voting power is 100', () => {
        const optimizedVotes = optimize('100', [
          ['1', '1'],
          ['2', '-2'],
          ['3', '3'],
          ['4', '4'],
          ['5', '0'],
          ['6', '6'],
          ['7', '7'],
          ['8', '8'],
          ['9', '-9'],
          ['10', '10'],
        ]);
        expect(optimizedVotes[0][1]).toBe('2.5641025641025643');
        expect(optimizedVotes[1][1]).toBe('-5.128205128205129');
        expect(optimizedVotes[2][1]).toBe('7.692307692307693');
        expect(optimizedVotes[3][1]).toBe('10.256410256410257');
        expect(optimizedVotes[4][1]).toBe('0');
        expect(optimizedVotes[5][1]).toBe('15.384615384615387');
        expect(optimizedVotes[6][1]).toBe('17.94871794871795');
        expect(optimizedVotes[7][1]).toBe('20.512820512820515');
        expect(optimizedVotes[8][1]).toBe('-23.07692307692308');
        expect(optimizedVotes[9][1]).toBe('25.641025641025642');
        let resultSum = optimizedVotes.reduce((accumulator, vote) => {
          return accumulator + Number(vote[1]);
        }, 0);
        expect(resultSum).toBe(71.7948717948718);
        const optimizedVotes2 = optimize('10000', [
          ['1', '1'],
          ['2', '-1'],
          ['3', '1'],
          ['4', '-1'],
          ['5', '1'],
          ['6', '-1'],
          ['7', '1'],
          ['8', '-1'],
          ['9', '1'],
          ['10', '0'],
        ]);
        expect(optimizedVotes2[8][1]).toBe('2000');
        resultSum = optimizedVotes2.reduce((accumulator, vote) => {
          return accumulator + Number(vote[1]);
        }, 0);
        expect(resultSum).toBe(2000);
      });
      it('should work as expected when voting power is 10000', async () => {
        const optimizedVotes = await optimize('10000', [
          ['1', '0'],
          ['2', '1000000'],
          ['3', '0'],
          ['4', '0'],
          ['5', '0'],
          ['6', '0'],
          ['7', '0'],
          ['8', '0'],
          ['9', '0'],
          ['10', '0'],
        ]);
        expect(optimizedVotes[1][1]).toBe('10000');
        const resultSum = optimizedVotes.reduce((accumulator, vote) => {
          return accumulator + Number(vote[1]);
        }, 0);
        expect(resultSum).toBe(10000);
      });
    });
    describe('Optimized proposals', () => {
      it('the sum of all optimized proposals should be less than tokensAvailable', () => {
        const proposals = [
          {
            proposalId: BigNumber.from('1'),
            votesReceived: BigNumber.from('100000'),
            tokensRequested: BigNumber.from('1000'),
          },
          {
            proposalId: BigNumber.from('2'),
            votesReceived: BigNumber.from('150000'),
            tokensRequested: BigNumber.from('2000'),
          },
          {
            proposalId: BigNumber.from('3'),
            votesReceived: BigNumber.from('100'),
            tokensRequested: BigNumber.from('3000'),
          },
        ];
        const tokensAvailable = 4000;
        const bestProposals = findBestProposals(proposals, tokensAvailable);
        const resultSum = bestProposals.reduce((accumulator, proposal) => {
          return accumulator + Number(fromWad(proposal.tokensRequested));
        }, 0);
        expect(resultSum).toBeLessThan(tokensAvailable);
      });
    });
  });
});
