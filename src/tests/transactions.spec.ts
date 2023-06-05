import { addAccountFromKey } from '../utils/add-account';
import { toWad } from '../utils/numeric';
import { TEST_CONFIG as config } from './test-constants';
import { BigNumber, providers } from 'ethers';
import dotenv from 'dotenv';
import { printValues } from '../utils';
import './test-utils.ts';
import { Address } from '../types';

dotenv.config();

jest.setTimeout(1200000);

const USDC_ADDRESS = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';
const USDT_ADDRESS = '0xdAC17F958D2ee523a2206206994597C13D831ec7';
const DAI_ADDRESS = '0x6B175474E89094C44Da98b954EedeAC495271d0F';
const LENDER_KEY = '0xf456f1fa8e9e7ec4d24f47c0470b7bb6d8807ac5a3a7a1c5e04ef89a25aa4f51';

describe.only('Transaction utils tests', () => {
  const provider = new providers.JsonRpcProvider(config.ETH_RPC_URL);
  const signerLender = addAccountFromKey(LENDER_KEY, provider);

  it.only('should return wrapped transaction object', async () => {
    const args: [Address, Address, BigNumber] = [USDC_ADDRESS, USDT_ADDRESS, toWad('0.05')];
    // const poolId = await dryRunDeployPool(signerLender, args);
    // console.log(`simulatedTx:`, simulatedTx);

    // printValues(simulatedTx);

    // const response = await tx.verifyAndSubmitResponse();

    // expect(response).toBeDefined();
    // expect(response.hash).not.toBe('');
    // expect(response.from).toBe(signerLender.address);

    // const receipt = await response.wait();

    // expect(receipt).toBeDefined();
    // expect(receipt.confirmations).toBe(1);
  });

  it.skip('validate method should not submit actual transaction; submit should submit actual transaction', async () => {
    // let tx = await ajna.factory.deployPool(signerLender, USDT_ADDRESS, DAI_ADDRESS, toWad('0.05'));
    // ensure verification does not advance the nonce
    // const nonce = await signerLender.getTransactionCount();
    // const responseString = await tx.verify();
    // expect(responseString).toBeDefined();
    // expect(await signerLender.getTransactionCount()).toBe(nonce);
    // // ensure pool does not exist, because transaction was never submitted
    // let pool: Pool;
    // await expect(async () => {
    //   pool = await ajna.factory.getPool(USDT_ADDRESS, DAI_ADDRESS);
    // }).rejects.toThrow('Pool for specified tokens was not found');
    // // submit a transaction to deploy the pool
    // tx = await ajna.factory.deployPool(signerLender, USDT_ADDRESS, DAI_ADDRESS, toWad('0.05'));
    // await tx.submit();
    // // confirm the pool now exists
    // pool = await ajna.factory.getPool(USDT_ADDRESS, DAI_ADDRESS);
    // expect(pool.poolAddress).not.toBe(constants.AddressZero);
    // expect(pool.collateralAddress).toBe(USDT_ADDRESS);
    // expect(pool.quoteAddress).toBe(DAI_ADDRESS);
    // expect(await signerLender.getTransactionCount()).toBe(nonce + 1);
  });
});
