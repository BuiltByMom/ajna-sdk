import { AjnaSDK } from '../classes/AjnaSDK';
import { Pool } from '../classes/Pool';
import { addAccountFromKey } from '../utils/add-account';
import { toWad } from '../utils/numeric';
import { TEST_CONFIG as config } from './test-constants';
import { constants, providers } from 'ethers';
import './test-utils';

jest.setTimeout(1200000);

const USDC_ADDRESS = '0x72BB61e78fcB9dB3b5B3C8035BD9edAB5edd601E';
const TESTC_ADDRESS = '0x674267c8A74fcAea8ccB1a196749B012e147005e';
const DAI_ADDRESS = '0x53D10CAFE79953Bf334532e244ef0A80c3618199';
const LENDER_KEY = '0xf456f1fa8e9e7ec4d24f47c0470b7bb6d8807ac5a3a7a1c5e04ef89a25aa4f51';

describe('Transaction Management', () => {
  const provider = new providers.JsonRpcProvider(config.ETH_RPC_URL);
  const ajna = new AjnaSDK(provider);
  const signerLender = addAccountFromKey(LENDER_KEY, provider);

  it('should return wrapped transaction object', async () => {
    const tx = await ajna.factory.deployPool(
      signerLender,
      USDC_ADDRESS,
      TESTC_ADDRESS,
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
    let tx = await ajna.factory.deployPool(signerLender, USDC_ADDRESS, DAI_ADDRESS, toWad('0.05'));

    // ensure verification does not advance the nonce
    const nonce = await signerLender.getTransactionCount();
    const responseString = await tx.verify();
    expect(responseString).toBeDefined();
    expect(await signerLender.getTransactionCount()).toBe(nonce);

    // ensure pool does not exist, because transaction was never submitted
    let pool: Pool;
    await expect(async () => {
      pool = await ajna.factory.getPool(USDC_ADDRESS, DAI_ADDRESS);
    }).rejects.toThrow('Pool for specified tokens was not found');

    // submit a transaction to deploy the pool
    tx = await ajna.factory.deployPool(signerLender, USDC_ADDRESS, DAI_ADDRESS, toWad('0.05'));
    await tx.submit();

    // confirm the pool now exists
    pool = await ajna.factory.getPool(USDC_ADDRESS, DAI_ADDRESS);
    expect(pool.poolAddress).not.toBe(constants.AddressZero);
    expect(pool.collateralAddress).toBe(USDC_ADDRESS);
    expect(pool.quoteAddress).toBe(DAI_ADDRESS);
    expect(await signerLender.getTransactionCount()).toBe(nonce + 1);
  });
});
