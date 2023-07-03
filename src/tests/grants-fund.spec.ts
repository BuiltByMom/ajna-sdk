import dotenv from 'dotenv';
import { providers } from 'ethers';
import { AjnaSDK } from '../classes/AjnaSDK';
import { addAccountFromKey } from '../utils/add-account';
import { TEST_CONFIG as config } from './test-constants';
import { expect } from '@jest/globals';
import { submitAndVerifyTransaction } from './test-utils';
import { startNewDistributionPeriod } from '../contracts/grant-fund';
import { timeJump } from '../utils/ganache';

dotenv.config();

jest.setTimeout(1200000);

const SIGNER_KEY = '0x2bbf23876aee0b3acd1502986da13a0f714c143fcc8ede8e2821782d75033ad1';

describe('Grants fund', () => {
  const provider = new providers.JsonRpcProvider(config.ETH_RPC_URL);
  const ajna = new AjnaSDK(provider);
  const signer = addAccountFromKey(SIGNER_KEY, provider);

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
