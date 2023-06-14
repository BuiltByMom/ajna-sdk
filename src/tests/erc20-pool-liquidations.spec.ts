import dotenv from 'dotenv';
import { providers } from 'ethers';
import { AjnaSDK } from '../classes/AjnaSDK';
import { FungiblePool } from '../classes/FungiblePool';
import { getErc20Contract } from '../contracts/erc20';
import { addAccountFromKey } from '../utils/add-account';
import { revertToSnapshot, takeSnapshot, timeJump } from '../utils/ganache';
import { toWad } from '../utils/numeric';
import { TEST_CONFIG as config } from './test-constants';
import { submitAndVerifyTransaction } from './test-utils';
import { expect } from '@jest/globals';
import { getBlockTime } from '../utils/time';
import { AuctionStatus } from '../classes/Liquidation';
import { Pool } from '../classes/Pool';
import { TOKEN_POOL } from '../types';

dotenv.config();

jest.setTimeout(1200000);

const TESTB_ADDRESS = '0x2622ebC317f21ec07DCf047593D6be8128Cf991c';
const QUOTE_ADDRESS = '0x94f6AAE460917F8B64bdf94453eD34C2a49c4E10';
const LENDER_KEY = '0x2bbf23876aee0b3acd1502986da13a0f714c143fcc8ede8e2821782d75033ad1';
const DEPLOYER_KEY = '0xd332a346e8211513373b7ddcf94b2b513b934b901258a9465c76d0d9a2b676d8';
const BORROWER_KEY = '0x997f91a295440dc31eca817270e5de1817cf32fa99adc0890dc71f8667574391';
const BORROWER2_KEY = '0xf456f1fa8e9e7ec4d24f47c0470b7bb6d8807ac5a3a7a1c5e04ef89a25aa4f51';

describe('Liquidations', () => {
  const provider = new providers.JsonRpcProvider(config.ETH_RPC_URL);
  const ajna = new AjnaSDK(provider);
  const signerLender = addAccountFromKey(LENDER_KEY, provider);
  const signerBorrower = addAccountFromKey(BORROWER_KEY, provider);
  const signerBorrower2 = addAccountFromKey(BORROWER2_KEY, provider);
  const signerDeployer = addAccountFromKey(DEPLOYER_KEY, provider);
  const TESTB = getErc20Contract(TESTB_ADDRESS, provider);
  // const TDAI = getErc20Contract(QUOTE_ADDRESS, provider);
  let pool: Pool | TOKEN_POOL | any;
  let snapshotId: number;

  beforeAll(async () => {
    pool = await ajna.factory.getPool(TESTB_ADDRESS, QUOTE_ADDRESS);
    // pool = getTokenPoolContract(pool as TOKEN_POOL);
    // approve
    let tx = await pool.quoteApprove(signerLender, toWad(40));
    await submitAndVerifyTransaction(tx);

    // add 9 quote tokens to 2001 bucket
    const higherBucketIndex = 2001;
    let quoteAmount = toWad(9);
    tx = await pool.addQuoteToken(signerLender, higherBucketIndex, quoteAmount);
    await submitAndVerifyTransaction(tx);

    // add 10 quote tokens to 2500 bucket (price 3863)
    const lowerBucketIndex = 2500;
    quoteAmount = toWad(10);
    tx = await pool.addQuoteToken(signerLender, lowerBucketIndex, quoteAmount);
    await submitAndVerifyTransaction(tx);

    // fund borrower2
    let receipt = await TESTB.connect(signerDeployer).transfer(
      signerBorrower2.address,
      toWad('10')
    );
    expect(receipt.hash).not.toBe('');

    // draw debt as borrower2
    const bucketIndex = 2001;
    let amountToBorrow = toWad(5);
    let collateralToPledge = toWad(0.0003);

    tx = await pool.collateralApprove(signerBorrower2, collateralToPledge);
    await submitAndVerifyTransaction(tx);

    tx = await pool.drawDebt(signerBorrower2, amountToBorrow, collateralToPledge);
    await submitAndVerifyTransaction(tx);

    // check pool lup index
    let stats = await pool.getStats();
    let lupIndex = await pool.depositIndex(stats.debt);
    expect(+lupIndex).toBe(bucketIndex);

    // check loan, make sure borrower2 threshold price is higher than lup price
    let bucket = await pool.getBucketByIndex(lupIndex);
    let lupPrice = bucket.price;
    const loan = await pool.getLoan(await signerBorrower2.getAddress());

    expect(lupPrice).toBeDefined();
    expect(lupPrice && lupPrice.gt(loan.thresholdPrice)).toBeTruthy();

    const isKickable = await pool.isKickable(signerBorrower2.address);
    expect(isKickable).toBeFalsy();

    // fund other borrower
    receipt = await TESTB.connect(signerDeployer).transfer(signerBorrower.address, toWad('10'));
    expect(receipt.hash).not.toBe('');

    // draw debt as another borrower to pull lup down
    amountToBorrow = toWad(10);
    collateralToPledge = toWad(1);
    tx = await pool.collateralApprove(signerBorrower, collateralToPledge);
    await submitAndVerifyTransaction(tx);
    tx = await pool.drawDebt(signerBorrower, amountToBorrow, collateralToPledge);
    await submitAndVerifyTransaction(tx);

    // check pool lup index again, make sure lup went below bucket 2001
    stats = await pool.getStats();
    lupIndex = await pool.depositIndex(stats.debt);
    expect(+lupIndex).toBeGreaterThan(bucketIndex);

    // check loan again, make sure borrower2 threshold price is lower than lup price
    bucket = await pool.getBucketByIndex(lupIndex);
    lupPrice = bucket.price;

    expect(lupPrice).toBeDefined();
    expect(lupPrice && lupPrice.lt(toWad(loan.thresholdPrice))).toBeTruthy();

    snapshotId = await takeSnapshot(provider);
  });

  afterEach(async () => {
    expect(await revertToSnapshot(provider, snapshotId)).toBeTruthy();
    // Re-take snapshot after every test, as same snapshot couldn't be used twice
    snapshotId = await takeSnapshot(provider);
  });

  it('should get multiple loans', async () => {
    const loan1 = await pool.getLoan(signerBorrower.address);
    const loan2 = await pool.getLoan(signerBorrower2.address);

    const loans = await pool.getLoans([signerBorrower.address, signerBorrower2.address]);
    expect(loans.size).toEqual(2);

    const loan1multi = loans.get(signerBorrower.address)!;
    expect(loan1multi.collateralization.eq(loan1.collateralization)).toBe(true);
    expect(loan1multi.debt.eq(loan1.debt)).toBe(true);
    expect(loan1multi.collateral.eq(loan1.collateral)).toBe(true);
    expect(loan1multi.thresholdPrice.eq(loan1.thresholdPrice)).toBe(true);
    expect(loan1multi.neutralPrice.eq(loan1.neutralPrice)).toBe(true);
    expect(loan1multi.liquidationBond.eq(loan1.liquidationBond)).toBe(true);

    const loan2multi = loans.get(signerBorrower2.address)!;
    expect(loan2multi.collateralization.eq(loan2.collateralization)).toBe(true);
    expect(loan2multi.debt.eq(loan2.debt)).toBe(true);
    expect(loan2multi.collateral.eq(loan2.collateral)).toBe(true);
    expect(loan2multi.thresholdPrice.eq(loan2.thresholdPrice)).toBe(true);
    expect(loan2multi.neutralPrice.eq(loan2.neutralPrice)).toBe(true);
    expect(loan2multi.liquidationBond.eq(loan2.liquidationBond)).toBe(true);
  });

  it('should use kick and isKickable', async () => {
    let isKickable = await pool.isKickable(signerBorrower.address);
    expect(isKickable).toBeFalsy();
    let liquidation = pool.getLiquidation(signerBorrower.address);
    let auctionStatus = await liquidation.getStatus();
    expect(auctionStatus.isTakeable).toBeFalsy();

    isKickable = await pool.isKickable(signerBorrower2.address);
    expect(isKickable).toBeTruthy();
    liquidation = pool.getLiquidation(signerBorrower.address);
    auctionStatus = await liquidation.getStatus();
    expect(auctionStatus.isTakeable).toBeFalsy();

    const tx = await pool.kick(signerLender, signerBorrower2.address);
    await submitAndVerifyTransaction(tx);
  });

  it('should use kickWithDeposit', async () => {
    const bucketIndex = 2001;

    const tx = await pool.kickWithDeposit(signerLender, bucketIndex);
    await submitAndVerifyTransaction(tx);
  });

  it('should use arb take', async () => {
    const bucketIndex = 2001;

    // kick first
    let tx = await pool.kick(signerLender, signerBorrower2.address);
    await submitAndVerifyTransaction(tx);
    const liquidation = pool.getLiquidation(signerBorrower2.address);

    // wait 8 hours
    const jumpTimeSeconds = 8 * 60 * 60; // 8 hours
    await timeJump(provider, jumpTimeSeconds);

    // take
    tx = await liquidation.arbTake(signerLender, bucketIndex);
    await submitAndVerifyTransaction(tx);

    const statuses = await pool.getLiquidationStatuses([signerBorrower2.address]);
    expect(statuses.size).toEqual(1);
    const auctionStatus: AuctionStatus = statuses.get(signerBorrower2.address)!;
    const blockTime = await getBlockTime(signerBorrower2);
    expect(auctionStatus.kickTime.valueOf() / 1000).toBeLessThan(blockTime);
    expect(auctionStatus.collateral).toEqual(toWad(0));
    expect(auctionStatus.debtToCover.lt(toWad('3.5'))).toBeTruthy();
    expect(auctionStatus.isTakeable).toBeFalsy();
    expect(auctionStatus.isCollateralized).toBeFalsy();
    expect(auctionStatus.price).toBeBetween(toWad(10000), toWad(12000));
    expect(auctionStatus.neutralPrice).toBeBetween(toWad(17400), toWad(17600));
  });

  it('should use deposit take', async () => {
    const bucketIndex = 2001;
    const allowance = 100000000;
    const quoteAmount = 10;

    // kick first
    let tx = await pool.kick(signerLender, signerBorrower2.address);
    await submitAndVerifyTransaction(tx);
    const liquidation = pool.getLiquidation(signerBorrower2.address);
    let auctionStatus = await liquidation.getStatus();
    expect(auctionStatus.isTakeable).toBeFalsy(); // in grace period

    // wait 8 hours
    const jumpTimeSeconds = 8 * 60 * 60; // 8 hours
    await timeJump(provider, jumpTimeSeconds);
    auctionStatus = await liquidation.getStatus();
    const blockTime = await getBlockTime(signerBorrower2);
    expect(auctionStatus.kickTime.valueOf() / 1000).toBeLessThan(blockTime);
    expect(auctionStatus.collateral).toEqual(toWad(0.0003));
    expect(auctionStatus.debtToCover).toBeBetween(toWad(5), toWad(6));
    expect(auctionStatus.isTakeable).toBeTruthy();
    expect(auctionStatus.isCollateralized).toBeFalsy();
    expect(auctionStatus.price).toBeBetween(toWad(10000), toWad(12000));
    expect(auctionStatus.neutralPrice).toBeBetween(toWad(17400), toWad(17600));

    // lender adds liquidity
    tx = await pool.quoteApprove(signerLender, toWad(allowance));
    await submitAndVerifyTransaction(tx);
    tx = await pool.addQuoteToken(signerLender, bucketIndex, toWad(quoteAmount));
    await submitAndVerifyTransaction(tx);

    // take
    tx = await liquidation.depositTake(signerLender, bucketIndex);
    await submitAndVerifyTransaction(tx);
  });

  it('should use take', async () => {
    // kick first
    let tx = await pool.kick(signerLender, signerBorrower2.address);
    await submitAndVerifyTransaction(tx);
    const liquidation = pool.getLiquidation(signerBorrower2.address);

    // wait 8 hours
    const jumpTimeSeconds = 8 * 60 * 60; // 8 hours
    await timeJump(provider, jumpTimeSeconds);

    // take
    tx = await liquidation.take(signerLender);
    await submitAndVerifyTransaction(tx);
  });

  it('should use settle', async () => {
    let tx = await pool.kick(signerLender, signerBorrower2.address);
    await submitAndVerifyTransaction(tx);

    const liquidation = pool.getLiquidation(signerBorrower2.address);
    const auctionStatus = await liquidation.getStatus();
    const blockTime = await getBlockTime(signerLender);
    expect(auctionStatus.kickTime.valueOf() / 1000).toBeLessThanOrEqual(blockTime);
    expect(auctionStatus.isTakeable).toBeFalsy();
    expect(auctionStatus.isCollateralized).toBeFalsy();

    await expect(async () => {
      tx = await liquidation.settle(signerBorrower);
      await tx.verify();
    }).rejects.toThrow('AuctionNotClearable()');

    // wait 72 hours
    const jumpTimeSeconds = 72 * 60 * 60; // 72 hours
    await timeJump(provider, jumpTimeSeconds);

    tx = await liquidation.settle(signerBorrower);
    await submitAndVerifyTransaction(tx);
  });
});
