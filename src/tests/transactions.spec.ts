import { addAccountFromKey } from '../utils/add-account';
import { toWad } from '../utils/numeric';
import { TEST_CONFIG as config } from './test-constants';
import { constants, providers } from 'ethers';
import dotenv from 'dotenv';
import { AjnaSDK } from '../classes/AjnaSDK';
import { getErc20Contract } from '../contracts';
import { FungiblePool } from '../classes/FungiblePool';
import { expect } from '@jest/globals';
import { parseTxEvents, submitAndVerifyTransaction } from './test-utils';
import { Pool } from '../classes/Pool';

dotenv.config();

jest.setTimeout(1200000);

const USDC_ADDRESS = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';
const USDT_ADDRESS = '0xdAC17F958D2ee523a2206206994597C13D831ec7';
const TWETH_ADDRESS = '0xC208f8196F1E1696b07Ea9407ed0555fdBC37c2e';
const TDAI_ADDRESS = '0x94f6AAE460917F8B64bdf94453eD34C2a49c4E10';
const TESTA_ADDRESS = '0x673f06730Df07D7b90E236092C3A501022083A31';
const LENDER_KEY = '0x2bbf23876aee0b3acd1502986da13a0f714c143fcc8ede8e2821782d75033ad1';
const LENDER_2_KEY = '0x6b7f753700a3fa90224871877bfb3d6bbd23bd7cc25d49430ce7020f5e39d463';
const DEPLOYER_KEY = '0xd332a346e8211513373b7ddcf94b2b513b934b901258a9465c76d0d9a2b676d8';
const BORROWER_KEY = '0x997f91a295440dc31eca817270e5de1817cf32fa99adc0890dc71f8667574391';

describe('Transaction utils tests', () => {
  const provider = new providers.JsonRpcProvider(config.ETH_RPC_URL);
  const ajna = new AjnaSDK(provider);
  const signerLender = addAccountFromKey(LENDER_KEY, provider);
  const signerLender2 = addAccountFromKey(LENDER_2_KEY, provider);
  const signerBorrower = addAccountFromKey(BORROWER_KEY, provider);
  const signerDeployer = addAccountFromKey(DEPLOYER_KEY, provider);
  const TWETH = getErc20Contract(TWETH_ADDRESS, provider);
  const TDAI = getErc20Contract(TDAI_ADDRESS, provider);
  const pool: FungiblePool = {} as FungiblePool;
  let poolA: FungiblePool = {} as FungiblePool;

  beforeAll(async () => {
    // fund lender
    let receipt = await TDAI.connect(signerDeployer).transfer(signerLender.address, toWad('100'));
    expect(receipt.hash).not.toBe('');
    receipt = await TWETH.connect(signerDeployer).transfer(signerLender.address, toWad('0.5'));
    expect(receipt.hash).not.toBe('');

    // fund lender2
    receipt = await TDAI.connect(signerDeployer).transfer(signerLender2.address, toWad('100'));
    expect(receipt.hash).not.toBe('');
    receipt = await TWETH.connect(signerDeployer).transfer(signerLender2.address, toWad('0.5'));
    expect(receipt.hash).not.toBe('');

    // fund borrower
    receipt = await TWETH.connect(signerDeployer).transfer(signerBorrower.address, toWad('10'));
    expect(receipt.hash).not.toBe('');
    receipt = await TDAI.connect(signerDeployer).transfer(signerBorrower.address, toWad('2'));
    expect(receipt.hash).not.toBe('');

    // initialize canned pool
    poolA = await ajna.factory.getPool(TESTA_ADDRESS, TDAI_ADDRESS);
  });

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
    let tx = await ajna.factory.deployPool(signerLender, USDC_ADDRESS, TDAI_ADDRESS, toWad('0.05'));
    // ensure verification does not advance the nonce
    const nonce = await signerLender.getTransactionCount();
    const responseString = await tx.verify();
    expect(responseString).toBeDefined();
    expect(await signerLender.getTransactionCount()).toBe(nonce);

    // ensure pool does not exist, because transaction was never submitted
    let pool: Pool;
    await expect(async () => {
      pool = await ajna.factory.getPool(USDC_ADDRESS, TDAI_ADDRESS);
    }).rejects.toThrow('Pool for specified tokens was not found');

    // submit a transaction to deploy the pool
    tx = await ajna.factory.deployPool(signerLender, USDC_ADDRESS, TDAI_ADDRESS, toWad('0.05'));
    const res = await tx.submit();
    const parsed = parseTxEvents(res);

    // confirm the pool now exists
    pool = await ajna.factory.getPool(USDC_ADDRESS, TDAI_ADDRESS);
    expect(pool.poolAddress).not.toBe(constants.AddressZero);
    expect(pool.collateralAddress).toBe(USDC_ADDRESS);
    expect(pool.quoteAddress).toBe(TDAI_ADDRESS);
    expect(await signerLender.getTransactionCount()).toBe(nonce + 1);
  });
});
