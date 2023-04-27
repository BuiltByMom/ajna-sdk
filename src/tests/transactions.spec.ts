import { AjnaSDK } from '../classes/AjnaSDK';
import { addAccountFromKey } from '../utils/add-account';
import { toWad } from '../utils/numeric';
import { TEST_CONFIG as config } from './test-constants';
import './test-utils.ts';
import dotenv from 'dotenv';
import { constants, providers } from 'ethers';

dotenv.config();

jest.setTimeout(1200000);

const USDC_ADDRESS = '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48';
const USDT_ADDRESS = '0xdAC17F958D2ee523a2206206994597C13D831ec7';
const DAI_ADDRESS = '0x6b175474e89094c44da98b954eedeac495271d0f';
const AJNA_TOKEN_ADDRESS = '0xaadebCF61AA7Da0573b524DE57c67aDa797D46c5';
const LENDER_KEY = '0x997f91a295440dc31eca817270e5de1817cf32fa99adc0890dc71f8667574391';

describe('Transaction utils tests', () => {
  const provider = new providers.JsonRpcProvider(config.ETH_RPC_URL);
  const ajna = new AjnaSDK(provider, AJNA_TOKEN_ADDRESS);
  const signerLender = addAccountFromKey(LENDER_KEY, provider);

  it('should return wrapped transaction object', async () => {
    const tx = await ajna.factory.deployPool(
      signerLender,
      USDC_ADDRESS,
      USDT_ADDRESS,
      toWad('0.05')
    );

    const response = await tx.verifyAndSubmitResponse();

    expect(response).toBeDefined();
    expect(response.hash).not.toBe('');
    expect(response.from).toBe(signerLender.address);

    const receipt = await response.wait();

    expect(receipt).toBeDefined();
    expect(receipt.confirmations).toBe(1);
  });

  it('validate method should not submit actual transaction; submit should submit actual transaction', async () => {
    let tx = await ajna.factory.deployPool(signerLender, USDT_ADDRESS, DAI_ADDRESS, toWad('0.05'));

    const nonce = await signerLender.getTransactionCount();
    const responseString = await tx.verify();

    expect(responseString).toBeDefined();
    expect(await signerLender.getTransactionCount()).toBe(nonce);

    let pool = await ajna.factory.getPool(USDT_ADDRESS, DAI_ADDRESS);

    expect(pool.poolAddress).toBe(constants.AddressZero);
    expect(pool.collateralAddress).toBe(USDT_ADDRESS);
    expect(pool.quoteAddress).toBe(DAI_ADDRESS);

    tx = await ajna.factory.deployPool(signerLender, USDT_ADDRESS, DAI_ADDRESS, toWad('0.05'));
    await tx.submit();

    pool = await ajna.factory.getPool(USDT_ADDRESS, DAI_ADDRESS);

    expect(pool.poolAddress).not.toBe(constants.AddressZero);
    expect(pool.collateralAddress).toBe(USDT_ADDRESS);
    expect(pool.quoteAddress).toBe(DAI_ADDRESS);
    expect(await signerLender.getTransactionCount()).toBe(nonce + 1);
  });
});
