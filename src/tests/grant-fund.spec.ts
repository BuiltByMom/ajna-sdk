import { expect } from '@jest/globals';
import dotenv from 'dotenv';
import { providers } from 'ethers';
import { AjnaSDK } from '../classes/AjnaSDK';
import { getProposalIdFromReceipt, startNewDistributionPeriod } from '../contracts/grant-fund';
import { DistributionPeriod } from '../types/classes';
import { addAccountFromKey } from '../utils/add-account';
import { mine, timeJump } from '../utils/ganache';
import { fromWad } from '../utils/numeric';
import { getBlock } from '../utils/time';
import { TEST_CONFIG as config } from './test-constants';
import { submitAndVerifyTransaction } from './test-utils';

dotenv.config();

jest.setTimeout(1200000);

const SIGNER_KEY = '0x2bbf23876aee0b3acd1502986da13a0f714c143fcc8ede8e2821782d75033ad1';

const DELEGATEE_ADDRESS = '0x8596d963e0DEBCa873A56FbDd2C9d119Aa0eB443';
const VOTER_ADDRESS = '0xeeDC2EE00730314b7d7ddBf7d19e81FB7E5176CA';
const VOTER_KEY = '0xd332a346e8211513373b7ddcf94b2b513b934b901258a9465c76d0d9a2b676d8';
const PROPOSAL_TO_ADDRESS = '0xbC33716Bb8Dc2943C0dFFdE1F0A1d2D66F33515E';

describe('Grants fund', () => {
  const provider = new providers.JsonRpcProvider(config.ETH_RPC_URL);
  const ajna = new AjnaSDK(provider);
  const signer = addAccountFromKey(SIGNER_KEY, provider);
  const voter = addAccountFromKey(VOTER_KEY, provider);
  describe('Distribution Period', () => {
    it(`fails to start a new distribution period if an active one already exists`, async () => {
      const tx = await startNewDistributionPeriod(signer);
      await expect(tx.verify()).rejects.toThrow('DistributionPeriodStillActive()');
    });

    it('should get the active distribution period', async () => {
      const dp = await ajna.distributionPeriods.getActiveDistributionPeriod();
      expect(dp.id).toBe(1);
      expect(dp.id).toBe(1);
      expect(dp.startBlock).toBeDefined();
      expect(dp.endBlock).toBeDefined();
      expect(dp.startDate).toBeDefined();
      expect(dp.endDate).toBeDefined();
      expect(dp.isActive).toBe(true);
      expect(dp.votesCount.isZero()).toBe(true);
      expect(dp.fundsAvailable.gt(0)).toBe(true);
    });

    it('should get the distribution by id', async () => {
      const dp = await ajna.distributionPeriods.getDistributionPeriod(1);
      expect(dp.id).toBe(1);
      expect(dp.startBlock).toBeDefined();
      expect(dp.endBlock).toBeDefined();
      expect(dp.startDate).toBeDefined();
      expect(dp.endDate).toBeDefined();
      expect(dp.isActive).toBe(true);
      expect(dp.votesCount.isZero()).toBe(true);
      expect(dp.fundsAvailable.gt(0)).toBe(true);
    });

    it('finish current distribution period and wait until inactive', async () => {
      await timeJump(provider, 3600 * 24 * 31 * 4); // jump three months in time
      // TODO: finish the current distribution period before trying to start a new one
    });

    it.skip(`throws and error getting active distribution period if it doesn't exist`, async () => {
      await expect(ajna.distributionPeriods.getActiveDistributionPeriod()).rejects.toThrow(
        'There is no active distribution period'
      );
    });

    it.skip(`starts a new distribution period if it doesn't exist`, async () => {
      const tx = await startNewDistributionPeriod(signer);
      await submitAndVerifyTransaction(tx);
      await expect(ajna.distributionPeriods.getActiveDistributionPeriod()).resolves.toBeDefined();
    });
  });
  describe('Proposals', () => {
    it(`creates a new proposal`, async () => {
      const tx = await ajna.distributionPeriods.createProposal(signer, {
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
      const proposalId = getProposalIdFromReceipt(receipt);
      const proposal = ajna.distributionPeriods.getProposal(proposalId);
      const proposalInfo = await proposal.getInfo();
      expect(proposalInfo.votesReceived.isZero()).toBe(true);
      expect(fromWad(proposalInfo.tokensRequested)).toBe('1000.0');
      expect(proposalInfo.fundingVotesReceived.isZero()).toBe(true);
      expect(proposalInfo.executed).toBe(false);
    });
  });
  describe('Delegates', () => {
    it('should delegate successfully', async () => {
      const delegate = await ajna.grants.delegateVote(voter, DELEGATEE_ADDRESS);
      expect(delegate).toBeDefined();
      const transaction = await delegate.verifyAndSubmit();
      expect(transaction.from).toBe(VOTER_ADDRESS);
      expect(transaction.to).toBe('0x25Af17eF4E2E6A4A2CE586C9D25dF87FD84D4a7d');
      expect(transaction.status).toBe(1);
    });
    it('should get delegate', async () => {
      const delegate = await ajna.grants.getDelegates(VOTER_ADDRESS);
      expect(delegate).toBeDefined();
      expect(delegate).toBe(DELEGATEE_ADDRESS);
    });
  });
  describe('Voting', () => {
    let distributionPeriod: DistributionPeriod;
    beforeAll(async () => {
      distributionPeriod = await ajna.distributionPeriods.getActiveDistributionPeriod();
      const currentBlock = await getBlock(provider);
      expect(distributionPeriod.startBlock < currentBlock.number);
      expect(distributionPeriod.blockNumber < currentBlock.number);
    });
    it('should get votes screening', async () => {
      const delegate = await ajna.grants.getVotesScreening(
        distributionPeriod.id,
        DELEGATEE_ADDRESS
      );
      expect(delegate).toBeDefined();
      expect(fromWad(delegate)).toBe('0.0');
    });
    it.skip('should get votes funding', async () => {
      const SCREENING_PERIOD_LENGTH = 525_600;
      await mine(provider, SCREENING_PERIOD_LENGTH);
      const delegate = await ajna.grants.getVotesFunding(distributionPeriod.id, DELEGATEE_ADDRESS);
      expect(delegate).toBeDefined();
      expect(fromWad(delegate)).toBe('490000000000000000.0');
    });
  });
});
