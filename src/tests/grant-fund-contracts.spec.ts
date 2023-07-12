import { expect } from '@jest/globals';
import dotenv from 'dotenv';
import { providers } from 'ethers';
import { AjnaSDK } from '../classes/AjnaSDK';
import { addAccountFromKey } from '../utils/add-account';
import { TEST_CONFIG as config } from './test-constants';
import { DistributionPeriod } from '../types/classes';
import { fromWad } from '../utils/numeric';
import { mine } from '../utils/ganache';
import { getBlock } from '../utils/time';

dotenv.config();

jest.setTimeout(1200000);

const DELEGATEE_ADDRESS = '0x8596d963e0DEBCa873A56FbDd2C9d119Aa0eB443';
const VOTER_ADDRESS = '0xeeDC2EE00730314b7d7ddBf7d19e81FB7E5176CA';
const SIGNER_KEY = '0xd332a346e8211513373b7ddcf94b2b513b934b901258a9465c76d0d9a2b676d8';

describe('Grant Fund', () => {
  const provider = new providers.JsonRpcProvider(config.ETH_RPC_URL);
  const ajna = new AjnaSDK(provider);
  const signer = addAccountFromKey(SIGNER_KEY, provider);

  describe('Delegates', () => {
    it('should delegate successfully', async () => {
      const delegate = await ajna.grants.delegateVote(signer, DELEGATEE_ADDRESS);
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
    it('should get votes funding', async () => {
      const SCREENING_PERIOD_LENGTH = 525_600;
      await mine(provider, SCREENING_PERIOD_LENGTH);
      const delegate = await ajna.grants.getVotesFunding(distributionPeriod.id, DELEGATEE_ADDRESS);
      expect(delegate).toBeDefined();
      expect(fromWad(delegate)).toBe('490000000000000000.0');
    });
  });
});
