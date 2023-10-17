import { AjnaSDK } from '../classes/AjnaSDK';
import { Pool } from '../classes/Pool';
import { addAccountFromKey } from '../utils/add-account';
import { toWad } from '../utils/numeric';
import { TEST_CONFIG as config } from './test-constants';
import { constants, providers } from 'ethers';
import './test-utils';

jest.setTimeout(1200000);

const TUSDC_ADDRESS = '0x606A640CB77AeCBfefe918AebDCB34845FF18546';
const TESTC_ADDRESS = '0x29eb88824f9F118B2aA975F6919D4a85189c9823';
const TDAI_ADDRESS = '0x4cEDCBb309d1646F3E91FB00c073bB28225262E6';
const LENDER_KEY = '0xf456f1fa8e9e7ec4d24f47c0470b7bb6d8807ac5a3a7a1c5e04ef89a25aa4f51';

describe('Transaction Management', () => {
  const provider = new providers.JsonRpcProvider(config.ETH_RPC_URL);
  const ajna = new AjnaSDK(provider);
  const signerLender = addAccountFromKey(LENDER_KEY, provider);

  it('should return wrapped transaction object', async () => {
    const tx = await ajna.fungiblePoolFactory.deployPool(
      signerLender,
      TUSDC_ADDRESS,
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
    let tx = await ajna.fungiblePoolFactory.deployPool(
      signerLender,
      TUSDC_ADDRESS,
      TDAI_ADDRESS,
      toWad('0.05')
    );

    // ensure verification does not advance the nonce
    const nonce = await signerLender.getTransactionCount();
    const responseString = await tx.verify();
    expect(responseString).toBeDefined();
    expect(await signerLender.getTransactionCount()).toBe(nonce);

    // ensure pool does not exist, because transaction was never submitted
    let pool: Pool;
    await expect(async () => {
      pool = await ajna.fungiblePoolFactory.getPool(TUSDC_ADDRESS, TDAI_ADDRESS);
    }).rejects.toThrow('Pool for specified tokens was not found');

    // submit a transaction to deploy the pool
    tx = await ajna.fungiblePoolFactory.deployPool(
      signerLender,
      TUSDC_ADDRESS,
      TDAI_ADDRESS,
      toWad('0.05')
    );
    await tx.submit();

    // confirm the pool now exists
    pool = await ajna.fungiblePoolFactory.getPool(TUSDC_ADDRESS, TDAI_ADDRESS);
    expect(pool.poolAddress).not.toBe(constants.AddressZero);
    expect(pool.collateralAddress).toBe(TUSDC_ADDRESS);
    expect(pool.quoteAddress).toBe(TDAI_ADDRESS);
    expect(await signerLender.getTransactionCount()).toBe(nonce + 1);
  });
});
