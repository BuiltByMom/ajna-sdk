import { constants, Wallet, providers, BigNumber } from 'ethers';
import { expect } from '@jest/globals';
import { AjnaSDK } from '../classes/AjnaSDK';
import { NonfungiblePool } from '../classes/NonfungiblePool';
import { balanceOf, getNftContract } from '../contracts/erc721';
import { TEST_CONFIG as config } from './test-constants';
import { submitAndVerifyTransaction } from './test-utils';
import { AuctionStatus } from '../types';
import { addAccountFromKey } from '../utils/add-account';
import { revertToSnapshot, takeSnapshot, timeJump } from '../utils/ganache';
import { toWad, wmul } from '../utils/numeric';
import { indexToPrice } from '../utils/pricing';
import { getBlockTime } from '../utils/time';

jest.setTimeout(1200000);

const TDUCK_ADDRESS = '0xaf36Ce3FD234ba81A9d4676CD09fC6700f087146';
const TDAI_ADDRESS = '0x4cEDCBb309d1646F3E91FB00c073bB28225262E6';
const DEPLOYER_KEY = '0xd332a346e8211513373b7ddcf94b2b513b934b901258a9465c76d0d9a2b676d8';
const LENDER_KEY = '0xaf12577dbd6c3f4837fe2ad515009f9f71b03ce8ba4a59c78c24fb5f445b6d01';
const BORROWER_KEY = '0x8b4c4ea4246dd9c3404eda8ec30145dbe9c23744876e50b31dc8e9a0d26f0c25';
const BORROWER2_KEY = '0xf456f1fa8e9e7ec4d24f47c0470b7bb6d8807ac5a3a7a1c5e04ef89a25aa4f51';

describe('ERC721 Liquidations', () => {
  const provider = new providers.JsonRpcProvider(config.ETH_RPC_URL);
  const ajna = new AjnaSDK(provider);
  const signerLender = addAccountFromKey(LENDER_KEY, provider);
  const signerBorrower = addAccountFromKey(BORROWER_KEY, provider);
  const signerBorrower2 = addAccountFromKey(BORROWER2_KEY, provider);
  const signerDeployer = addAccountFromKey(DEPLOYER_KEY, provider);
  const TDUCK = getNftContract(TDUCK_ADDRESS, provider);
  const testTokenIds = [1, 2, 3, 4, 5];
  let poolDuckDai: NonfungiblePool;
  let snapshotId: number;
  let originalSnapshot: number;

  const fundAndApproveCollateral = async (
    signer: Wallet,
    pool: NonfungiblePool,
    tokenIds: Array<number>
  ) => {
    for (let i = 0; i < tokenIds.length; i++) {
      const tokenId = tokenIds[i];

      // fund borrower
      const receipt = await TDUCK.connect(signerDeployer).transferFrom(
        signerDeployer.address,
        signer.address,
        tokenId
      );
      expect(receipt.transactionHash).not.toBe('');

      // approve
      const tx = await pool.collateralApprove(signer, tokenId);
      await submitAndVerifyTransaction(tx);
    }
  };

  beforeAll(async () => {
    // take snapshot before all tests
    originalSnapshot = await takeSnapshot(provider);

    poolDuckDai = await ajna.nonfungiblePoolFactory.getPool(TDUCK_ADDRESS, [], TDAI_ADDRESS);

    // approve
    let tx = await poolDuckDai.quoteApprove(signerLender, toWad(60000));
    await submitAndVerifyTransaction(tx);

    // add 21,000 quote tokens to 2001 bucket
    const higherBucket = await poolDuckDai.getBucketByIndex(2001);
    let quoteAmount = toWad(21000);
    tx = await higherBucket.addQuoteToken(signerLender, quoteAmount);
    await submitAndVerifyTransaction(tx);

    // add 5000 quote tokens to 2500 bucket
    const lowerBucket = await poolDuckDai.getBucketByIndex(2500);
    quoteAmount = toWad(5000);
    tx = await lowerBucket.addQuoteToken(signerLender, quoteAmount);
    await submitAndVerifyTransaction(tx);

    // draw debt as borrower2
    const bucketIndex = 2001;
    let amountToBorrow = toWad(18000);
    const collateralToPledge = 2;
    let tokenIdsToPledge = testTokenIds.slice(0, collateralToPledge);
    await fundAndApproveCollateral(signerBorrower2, poolDuckDai, tokenIdsToPledge);
    tx = await poolDuckDai.drawDebt(signerBorrower2, amountToBorrow, tokenIdsToPledge);
    await submitAndVerifyTransaction(tx);

    // check pool lup index
    let stats = await poolDuckDai.getStats();
    let lupIndex = await poolDuckDai.depositIndex(stats.debt);
    expect(+lupIndex).toBe(bucketIndex);

    // check loan, make sure borrower2 threshold price is higher than lup price
    let bucket = await poolDuckDai.getBucketByIndex(lupIndex);
    let lupPrice = bucket.price;
    const loan = await poolDuckDai.getLoan(await signerBorrower2.getAddress());

    expect(lupPrice).toBeDefined();
    expect(lupPrice && lupPrice.gt(loan.thresholdPrice)).toBeTruthy();

    const isKickable = await poolDuckDai.isKickable(signerBorrower2.address);
    expect(isKickable).toBeFalsy();

    // draw debt as borrower1 to pull the lup down
    amountToBorrow = toWad(6000);
    tokenIdsToPledge = testTokenIds.slice(collateralToPledge);
    await fundAndApproveCollateral(signerBorrower, poolDuckDai, tokenIdsToPledge);
    tx = await poolDuckDai.drawDebt(signerBorrower, amountToBorrow, tokenIdsToPledge);
    await submitAndVerifyTransaction(tx);

    // check pool lup index again, make sure lup went below bucket 2001
    stats = await poolDuckDai.getStats();
    lupIndex = await poolDuckDai.depositIndex(stats.debt);
    expect(+lupIndex).toBeGreaterThan(bucketIndex);

    // check loan again, make sure borrower2 threshold price is lower than lup price
    bucket = await poolDuckDai.getBucketByIndex(lupIndex);
    lupPrice = bucket.price;

    expect(lupPrice).toBeDefined();
    expect(lupPrice && lupPrice.lt(loan.thresholdPrice)).toBeTruthy();

    snapshotId = await takeSnapshot(provider);
  });

  afterEach(async () => {
    expect(await revertToSnapshot(provider, snapshotId)).toBeTruthy();
    // Re-take snapshot after every test, as same snapshot couldn't be used twice
    snapshotId = await takeSnapshot(provider);
  });

  afterAll(async () => {
    // revert state to before liquidations were setup
    expect(await revertToSnapshot(provider, originalSnapshot)).toBeTruthy();
  });

  it('should get multiple loans', async () => {
    const loan1 = await poolDuckDai.getLoan(signerBorrower.address);
    const loan2 = await poolDuckDai.getLoan(signerBorrower2.address);

    const loans = await poolDuckDai.getLoans([signerBorrower.address, signerBorrower2.address]);
    expect(loans.size).toEqual(2);

    const loan1multi = loans.get(signerBorrower.address)!;
    expect(loan1multi.collateralization.eq(loan1.collateralization)).toBe(true);
    expect(loan1multi.debt.eq(loan1.debt)).toBe(true);
    expect(loan1multi.collateral.eq(loan1.collateral)).toBe(true);
    expect(loan1multi.thresholdPrice.eq(loan1.thresholdPrice)).toBe(true);
    expect(loan1multi.neutralPrice.eq(loan1.neutralPrice)).toBe(true);
    expect(loan1multi.liquidationBond.eq(loan1.liquidationBond)).toBe(true);
    expect(loan1multi.isKicked).toBe(loan1.isKicked);

    const loan2multi = loans.get(signerBorrower2.address)!;
    expect(loan2multi.collateralization.eq(loan2.collateralization)).toBe(true);
    expect(loan2multi.debt.eq(loan2.debt)).toBe(true);
    expect(loan2multi.collateral.eq(loan2.collateral)).toBe(true);
    expect(loan2multi.thresholdPrice.eq(loan2.thresholdPrice)).toBe(true);
    expect(loan2multi.neutralPrice.eq(loan2.neutralPrice)).toBe(true);
    expect(loan2multi.liquidationBond.eq(loan2.liquidationBond)).toBe(true);
    expect(loan2multi.isKicked).toBe(loan2.isKicked);
  });

  it('should use kick and isKickable', async () => {
    let isKickable = await poolDuckDai.isKickable(signerBorrower.address);
    expect(isKickable).toBeFalsy();
    let liquidation = poolDuckDai.getLiquidation(signerBorrower.address);
    let auctionStatus = await liquidation.getStatus();
    expect(auctionStatus.isTakeable).toBeFalsy();

    isKickable = await poolDuckDai.isKickable(signerBorrower2.address);
    expect(isKickable).toBeTruthy();
    liquidation = poolDuckDai.getLiquidation(signerBorrower2.address);
    auctionStatus = await liquidation.getStatus();
    expect(auctionStatus.isTakeable).toBeFalsy();

    const tx = await poolDuckDai.kick(signerLender, signerBorrower2.address);
    await submitAndVerifyTransaction(tx);
  });

  it('should use lenderKick', async () => {
    const bucket = await poolDuckDai.getBucketByIndex(2001);

    // check state prior to the lenderKick
    const loan = await poolDuckDai.getLoan(signerBorrower2.address);
    let kickerInfo = await poolDuckDai.kickerInfo(signerLender.address);
    expect(kickerInfo.claimable.eq(constants.Zero)).toBe(true);
    expect(kickerInfo.locked.eq(constants.Zero)).toBe(true);

    const tx = await bucket.lenderKick(signerLender);
    await submitAndVerifyTransaction(tx);

    // ensure the liquidation bond estimate was accurate
    kickerInfo = await poolDuckDai.kickerInfo(signerLender.address);
    expect(kickerInfo.claimable.eq(constants.Zero)).toBe(true);
    expect(loan.liquidationBond.gt(0)).toBe(true);
    expect(kickerInfo.locked).toBeBetween(
      loan.liquidationBond,
      wmul(loan.liquidationBond, toWad('1.0001'))
    );

    // confirm liquidation locked bucket is conveyed
    const prices = await poolDuckDai.getPrices();
    expect(prices.hpb).toEqual(indexToPrice(2001));
    expect(prices.hpbIndex).toEqual(2001);
    expect(prices.llb).toEqual(prices.hpb);
    expect(prices.llbIndex).toEqual(prices.hpbIndex);
  });

  it('should use arb take', async () => {
    const bucketIndex = 2001;

    // kick first
    let tx = await poolDuckDai.kick(signerLender, signerBorrower2.address);
    await submitAndVerifyTransaction(tx);
    const liquidation = poolDuckDai.getLiquidation(signerBorrower2.address);

    // wait 8 hours
    const jumpTimeSeconds = 8 * 60 * 60; // 8 hours
    await timeJump(provider, jumpTimeSeconds);
    const statuses = await poolDuckDai.getLiquidationStatuses([signerBorrower2.address]);
    expect(statuses.size).toEqual(1);
    const auctionStatus: AuctionStatus = statuses.get(signerBorrower2.address)!;
    const blockTime = await getBlockTime(signerBorrower2);
    expect(auctionStatus.kickTime.valueOf() / 1000).toBeLessThan(blockTime);
    expect(auctionStatus.kickTime.valueOf() / 1000).toBeGreaterThan(0);
    expect(auctionStatus.collateral).toEqual(toWad(2));
    expect(auctionStatus.debtToCover).toBeBetween(toWad(18000), toWad(19000));
    expect(auctionStatus.isTakeable).toBe(true);
    expect(auctionStatus.isCollateralized).toBe(false);
    expect(auctionStatus.price).toBeBetween(toWad(5100), toWad(5200));
    expect(auctionStatus.neutralPrice).toBeBetween(toWad(9400), toWad(10400));
    expect(auctionStatus.isSettleable).toBe(false);

    // take
    tx = await liquidation.arbTake(signerLender, bucketIndex);
    await submitAndVerifyTransaction(tx);
  });

  it('should use deposit take', async () => {
    const bucket = await poolDuckDai.getBucketByIndex(2001);
    const allowance = 100000000;
    const quoteAmount = 30000;

    // kick first
    let tx = await poolDuckDai.kick(signerLender, signerBorrower2.address);
    await submitAndVerifyTransaction(tx);
    const liquidation = poolDuckDai.getLiquidation(signerBorrower2.address);
    let auctionStatus = await liquidation.getStatus();
    expect(auctionStatus.isTakeable).toBeFalsy(); // in grace period

    // check auction status after kicking and before bucketTake
    expect(auctionStatus.debtToCover.gt(toWad('3.5'))).toBeTruthy();

    // wait 8 hours and check auction status
    const jumpTimeSeconds = 8 * 60 * 60; // 8 hours
    await timeJump(provider, jumpTimeSeconds);
    auctionStatus = await liquidation.getStatus();
    const blockTime = await getBlockTime(signerBorrower2);
    expect(auctionStatus.kickTime.valueOf() / 1000).toBeLessThan(blockTime);
    expect(auctionStatus.kickTime.valueOf() / 1000).toBeGreaterThan(0);
    expect(auctionStatus.collateral).toEqual(toWad(2));
    expect(auctionStatus.debtToCover).toBeBetween(toWad(18000), toWad(19000));
    expect(auctionStatus.isTakeable).toBe(true);
    expect(auctionStatus.isCollateralized).toBe(false);
    expect(auctionStatus.price).toBeBetween(toWad(5100), toWad(5200));
    expect(auctionStatus.neutralPrice).toBeBetween(toWad(9400), toWad(10400));
    expect(auctionStatus.isSettleable).toBe(false);

    // lender adds liquidity
    tx = await poolDuckDai.quoteApprove(signerLender, toWad(allowance));
    await submitAndVerifyTransaction(tx);
    tx = await bucket.addQuoteToken(signerLender, toWad(quoteAmount));
    await submitAndVerifyTransaction(tx);

    // deposit take
    tx = await liquidation.depositTake(signerLender, bucket.index);
    const receipt = await submitAndVerifyTransaction(tx);
    const bucketTakeEventLogs = tx.getEventLogs(receipt).get('BucketTake')![0];
    const collateral = bucketTakeEventLogs.args['collateral'].toString();
    console.log('collateral in event', collateral);
    expect(BigInt(collateral)).toBeGreaterThan(0);
  });

  it('should use mergeOrRemoveCollateral', async () => {
    const bucket = await poolDuckDai.getBucketByIndex(2001);
    const allowance = 100000000;
    const quoteAmount = 30000;

    // kick first
    let tx = await poolDuckDai.kick(signerLender, signerBorrower2.address);
    await submitAndVerifyTransaction(tx);
    const liquidation = poolDuckDai.getLiquidation(signerBorrower2.address);
    let auctionStatus = await liquidation.getStatus();
    expect(auctionStatus.isTakeable).toBeFalsy(); // in grace period

    // check auction status after kicking and before bucketTake
    expect(auctionStatus.debtToCover.gt(toWad('3.5'))).toBeTruthy();

    // wait 8 hours and check auction status
    const jumpTimeSeconds = 8 * 60 * 60; // 8 hours
    await timeJump(provider, jumpTimeSeconds);
    auctionStatus = await liquidation.getStatus();

    // lender adds liquidity
    tx = await poolDuckDai.quoteApprove(signerLender, toWad(allowance));
    await submitAndVerifyTransaction(tx);
    tx = await bucket.addQuoteToken(signerLender, toWad(quoteAmount));
    await submitAndVerifyTransaction(tx);

    // deposit take
    tx = await liquidation.depositTake(signerLender, bucket.index);
    const receipt = await submitAndVerifyTransaction(tx);
    const bucketTakeEventLogs = tx.getEventLogs(receipt).get('BucketTake')![0];
    const collateral = bucketTakeEventLogs.args['collateral'].toString();
    console.log('collateral in event', collateral);
    expect(BigInt(collateral)).toBeGreaterThan(0);

    // mergeOrRemoveCollateral
    tx = await poolDuckDai.mergeOrRemoveCollateral(signerLender, [bucket.index], 1, 2001);
    await submitAndVerifyTransaction(tx);

    // check token balance after merge and remove
    expect((await balanceOf(signerLender, signerLender.address, TDUCK_ADDRESS)).toNumber()).toEqual(
      1
    );
  });

  it('should use take', async () => {
    // kick first
    let tx = await poolDuckDai.kick(signerLender, signerBorrower2.address);
    await submitAndVerifyTransaction(tx);
    const liquidation = poolDuckDai.getLiquidation(signerBorrower2.address);

    // wait 8 hours
    const jumpTimeSeconds = 12 * 3600; // 12 hours
    await timeJump(provider, jumpTimeSeconds);

    // take some of the collateral
    tx = await liquidation.take(signerLender, BigNumber.from(1));
    await submitAndVerifyTransaction(tx);

    // should not be able to withdraw bond prior to settlement
    await expect(async () => {
      tx = await poolDuckDai.withdrawBonds(signerLender);
      await tx.verify();
    }).rejects.toThrow('InsufficientLiquidity()');

    // check auction status after take
    let statuses = await poolDuckDai.getLiquidationStatuses([signerBorrower2.address]);
    expect(statuses.size).toEqual(1);
    let auctionStatus: AuctionStatus = statuses.get(signerBorrower2.address)!;
    let blockTime = await getBlockTime(signerBorrower2);
    expect(auctionStatus.kickTime.valueOf() / 1000).toBeLessThan(blockTime);
    expect(auctionStatus.collateral).toEqual(toWad(1));
    expect(auctionStatus.collateral.gt(toWad(0)) && auctionStatus.collateral.lt(toWad(2))).toBe(
      true
    );
    expect(auctionStatus.debtToCover).toBeBetween(toWad(16700), toWad(16800));
    expect(auctionStatus.isTakeable).toBe(true);
    expect(auctionStatus.isCollateralized).toBe(false);
    expect(auctionStatus.neutralPrice).toBeBetween(toWad(9000), toWad(11000));
    expect(auctionStatus.isSettleable).toBe(false);

    // wait 50 hours
    const jumpTimeSecondsTwo = 50 * 60 * 60; // 50 hours
    await timeJump(provider, jumpTimeSecondsTwo);

    // take the remaining collateral
    tx = await liquidation.take(signerLender, BigNumber.from(1));
    await submitAndVerifyTransaction(tx);

    statuses = await poolDuckDai.getLiquidationStatuses([signerBorrower2.address]);
    expect(statuses.size).toEqual(1);
    auctionStatus = statuses.get(signerBorrower2.address)!;
    blockTime = await getBlockTime(signerBorrower2);
    expect(auctionStatus.kickTime.valueOf() / 1000).toBeLessThan(blockTime);
    expect(auctionStatus.collateral).toEqual(toWad(0));
    expect(auctionStatus.debtToCover).toBeBetween(toWad(16000), toWad(19000));
    expect(auctionStatus.isTakeable).toBe(false);
    expect(auctionStatus.isCollateralized).toBe(false);
    expect(auctionStatus.isSettleable).toBe(true);
  });

  // settle liquidation after 72 hours have passed with no Takes
  it('should use settle', async () => {
    let tx = await poolDuckDai.kick(signerLender, signerBorrower2.address);
    await submitAndVerifyTransaction(tx);

    let loan = await poolDuckDai.getLoan(signerBorrower2.address);
    expect(loan.isKicked).toBe(true);
    const liquidation = poolDuckDai.getLiquidation(signerBorrower2.address);
    let auctionStatus = await liquidation.getStatus();
    let blockTime = await getBlockTime(signerLender);
    expect(auctionStatus.kickTime.valueOf() / 1000).toBeLessThanOrEqual(blockTime);
    expect(auctionStatus.isTakeable).toBe(false);
    expect(auctionStatus.isCollateralized).toBe(false);
    expect(auctionStatus.isSettleable).toBe(false);

    // should not be able to settle yet
    await expect(async () => {
      tx = await liquidation.settle(signerLender);
      await tx.verify();
    }).rejects.toThrow('AuctionNotClearable()');

    // wait just over 72 hours
    const three_days = 72 * 3600; // 72 hours
    await timeJump(provider, three_days + 12);
    auctionStatus = await liquidation.getStatus();
    expect(auctionStatus.isSettleable).toBe(true);
    blockTime = await getBlockTime(signerLender);
    expect(auctionStatus.kickTime.valueOf() / 1000 + three_days).toBeLessThanOrEqual(blockTime);

    // kicker's liquidation bond remains locked before settle
    let kickerInfo = await poolDuckDai.kickerInfo(signerLender.address);
    expect(kickerInfo.claimable.eq(constants.Zero)).toBe(true);
    expect(kickerInfo.locked.gt(constants.Zero)).toBe(true);

    tx = await liquidation.settle(signerLender);
    await submitAndVerifyTransaction(tx);
    loan = await poolDuckDai.getLoan(signerBorrower2.address);
    expect(loan.isKicked).toBe(false);

    // kicker's liquidation bond becomes claimable
    kickerInfo = await poolDuckDai.kickerInfo(signerLender.address);
    expect(kickerInfo.claimable.gt(constants.Zero)).toBe(true);
    expect(kickerInfo.locked.eq(constants.Zero)).toBe(true);

    // withdraw liquidation bond
    tx = await poolDuckDai.withdrawBonds(signerLender);
    await submitAndVerifyTransaction(tx);

    // kicker's liquidation bond has been claimed
    kickerInfo = await poolDuckDai.kickerInfo(signerLender.address);
    expect(kickerInfo.claimable.eq(constants.Zero)).toBe(true);
    expect(kickerInfo.locked.eq(constants.Zero)).toBe(true);

    auctionStatus = await liquidation.getStatus();
    expect(auctionStatus.kickTime.valueOf()).toEqual(0);
    expect(auctionStatus.isTakeable).toBeFalsy();
    expect(auctionStatus.isSettleable).toBe(false);
  });

  it('should use settle before 72 hours', async () => {
    let tx = await poolDuckDai.kick(signerLender, signerBorrower2.address);
    await submitAndVerifyTransaction(tx);

    let loan = await poolDuckDai.getLoan(signerBorrower2.address);
    expect(loan.isKicked).toBe(true);
    const liquidation = poolDuckDai.getLiquidation(signerBorrower2.address);
    let auctionStatus = await liquidation.getStatus();
    const blockTime = await getBlockTime(signerLender);
    expect(auctionStatus.kickTime.valueOf() / 1000).toBeLessThanOrEqual(blockTime);
    expect(auctionStatus.isTakeable).toBe(false);
    expect(auctionStatus.isCollateralized).toBe(false);
    expect(auctionStatus.isSettleable).toBe(false);

    // should not be able to settle yet
    await expect(async () => {
      tx = await liquidation.settle(signerLender);
      await tx.verify();
    }).rejects.toThrow('AuctionNotClearable()');

    // wait 71 hours
    const jumpTimeSeconds = 71 * 3600;
    await timeJump(provider, jumpTimeSeconds);
    expect(auctionStatus.isSettleable).toBe(false);

    // take all collateral
    tx = await liquidation.take(signerLender, BigNumber.from(2));
    await submitAndVerifyTransaction(tx);

    // kicker's liquidation bond remains locked before settle
    let kickerInfo = await poolDuckDai.kickerInfo(signerLender.address);
    expect(kickerInfo.claimable.eq(constants.Zero)).toBe(true);
    expect(kickerInfo.locked.gt(constants.Zero)).toBe(true);

    // check that collateral == 0 and debt != 0
    auctionStatus = await liquidation.getStatus();
    expect(auctionStatus.debtToCover.gt(constants.Zero)).toBe(true);
    expect(auctionStatus.collateral.eq(constants.Zero)).toBe(true);
    expect(auctionStatus.isSettleable).toBe(true);

    // settle is called where debt != 0 and collateral == 0
    tx = await liquidation.settle(signerLender);
    await submitAndVerifyTransaction(tx);
    loan = await poolDuckDai.getLoan(signerBorrower2.address);
    expect(loan.isKicked).toBe(false);

    // kicker's liquidation bond becomes claimable
    kickerInfo = await poolDuckDai.kickerInfo(signerLender.address);
    expect(kickerInfo.claimable.gt(constants.Zero)).toBe(true);
    expect(kickerInfo.locked.eq(constants.Zero)).toBe(true);

    // withdraw liquidation bond
    tx = await poolDuckDai.withdrawBonds(signerLender);
    await submitAndVerifyTransaction(tx);

    // kicker's liquidation bond has been claimed
    kickerInfo = await poolDuckDai.kickerInfo(signerLender.address);
    expect(kickerInfo.claimable.eq(constants.Zero)).toBe(true);
    expect(kickerInfo.locked.eq(constants.Zero)).toBe(true);

    auctionStatus = await liquidation.getStatus();
    expect(auctionStatus.kickTime.valueOf()).toEqual(0);
    expect(auctionStatus.isTakeable).toBeFalsy();
    expect(auctionStatus.isSettleable).toBe(false);
  });
});
