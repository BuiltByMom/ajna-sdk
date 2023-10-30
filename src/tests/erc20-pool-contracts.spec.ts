import { expect } from '@jest/globals';
import { BigNumber, constants, providers } from 'ethers';
import { AjnaSDK } from '../classes/AjnaSDK';
import { FungibleBucket } from '../classes/FungibleBucket';
import { FungiblePool } from '../classes/FungiblePool';
import { Stats } from '../classes/Pool';
import { Config, HOUR_TO_SECONDS } from '../constants';
import { getErc20Contract } from '../contracts/erc20';
import { addAccountFromKey } from '../utils/add-account';
import { mine, timeJump } from '../utils/ganache';
import { fromWad, toWad, wdiv, wmul } from '../utils/numeric';
import { indexToPrice, priceToIndex } from '../utils/pricing';
import { getBlockTime, getExpiry } from '../utils/time';
import { TEST_CONFIG as config } from './test-constants';
import { submitAndVerifyTransaction } from './test-utils';

jest.setTimeout(80000);

const TWETH_ADDRESS = '0x770E225E95Bf56553970FBd44b10B2B0A1285145';
const TDAI_ADDRESS = '0x28B1d8a6b621ae7e28F4Ec148Dd6140387f86dBa';
const TESTA_ADDRESS = '0xdb475551A4E81Dd837ff29a1fEc6b20E62270749';
const TESTB_TDAI_POOL_ADDRESS = '0xFbaeC3F232c5CEba17C1a5911020528D6D50CDd8';
const LENDER_KEY = '0x2bbf23876aee0b3acd1502986da13a0f714c143fcc8ede8e2821782d75033ad1';
const LENDER_2_KEY = '0x6b7f753700a3fa90224871877bfb3d6bbd23bd7cc25d49430ce7020f5e39d463';
const DEPLOYER_KEY = '0xd332a346e8211513373b7ddcf94b2b513b934b901258a9465c76d0d9a2b676d8';
const BORROWER_KEY = '0x997f91a295440dc31eca817270e5de1817cf32fa99adc0890dc71f8667574391';

describe('ERC20 Pool', () => {
  const provider = new providers.JsonRpcProvider(config.ETH_RPC_URL);
  const ajna = new AjnaSDK(provider);
  const signerLender = addAccountFromKey(LENDER_KEY, provider);
  const signerLender2 = addAccountFromKey(LENDER_2_KEY, provider);
  const signerBorrower = addAccountFromKey(BORROWER_KEY, provider);
  let pool: FungiblePool = {} as FungiblePool;
  let poolA: FungiblePool = {} as FungiblePool;

  beforeAll(async () => {
    // initialize canned pool
    poolA = await ajna.fungiblePoolFactory.getPool(TESTA_ADDRESS, TDAI_ADDRESS);
  });

  it('should create new pool successfully', async () => {
    const tx = await ajna.fungiblePoolFactory.deployPool(
      signerLender,
      TWETH_ADDRESS,
      TDAI_ADDRESS,
      toWad('0.05')
    );
    const receipt = await tx.verifyAndSubmit();
    const eventLogs = tx.getEventLogs(receipt);
    const poolAddress = eventLogs.get('PoolCreated')![0].args[0];

    pool = await ajna.fungiblePoolFactory.getPool(TWETH_ADDRESS, TDAI_ADDRESS);
    expect(pool).toBeDefined();
    expect(pool.poolAddress).toBe(poolAddress);
    expect(pool.collateralAddress).toBe(TWETH_ADDRESS);
    expect(pool.quoteAddress).toBe(TDAI_ADDRESS);
    expect(pool.toString()).toContain('TWETH-TDAI');
  });

  it('should not allow to create existing pool', async () => {
    const tx = await ajna.fungiblePoolFactory.deployPool(
      signerLender,
      TESTA_ADDRESS,
      TDAI_ADDRESS,
      toWad('0.05')
    );

    await expect(async () => {
      await tx.verify();
    }).rejects.toThrow('PoolAlreadyExists(address)');
  });

  it('should load pool by address', async () => {
    const poolB = await ajna.fungiblePoolFactory.getPoolByAddress(TESTB_TDAI_POOL_ADDRESS);
    expect(poolB.quoteAddress).toBe(TDAI_ADDRESS);
    expect(poolB.toString()).toContain('TESTB-TDAI');
  });

  it('should use addQuoteToken successfully', async () => {
    const quoteAmount = toWad(10_000);
    const bucket = await pool.getBucketByIndex(2000); // price 46776.6533691354

    let tx = await pool.quoteApprove(signerLender, quoteAmount);
    await submitAndVerifyTransaction(tx);

    tx = await bucket.addQuoteToken(signerLender, quoteAmount);
    await submitAndVerifyTransaction(tx);
    const bucketStatus = await bucket.getStatus();
    expect(bucketStatus.bucketLP.gt(0)).toBe(true);
    expect(bucketStatus.exchangeRate.eq(toWad(1))).toBe(true);

    const lpBalance = await bucket.lpBalance(signerLender.address);
    expect(lpBalance).toEqual(quoteAmount);
  });

  it('should get origination fee rate', async () => {
    const feeRate = await pool.getOriginationFeeRate();
    expect(feeRate).toBeBetween(constants.Zero, toWad('0.01'));
  });

  it('should use drawDebt successfully', async () => {
    const amountToBorrow = toWad(5_000);
    const limitIndex = 2000;
    const collateralToPledge = toWad(3.0);

    let tx = await pool.collateralApprove(signerBorrower, collateralToPledge);
    await tx.verifyAndSubmit();
    tx = await pool.drawDebt(signerBorrower, amountToBorrow, collateralToPledge, limitIndex);
    await submitAndVerifyTransaction(tx);

    const loan = await pool.getLoan(signerBorrower.address);
    expect(loan.debt).toBeBetween(toWad(5000), toWad(5050));
    expect(loan.neutralPrice).toBeBetween(toWad(1915), toWad(1930));
  });

  it('should estimate interest rate change successfully', async () => {
    const poolStats: Stats = {
      poolSize: constants.Zero,
      debt: constants.Zero,
      liquidationDebt: constants.Zero,
      loansCount: 0,
      minDebtAmount: constants.Zero,
      collateralization: constants.Zero,
      actualUtilization: toWad('0.5'),
      targetUtilization: toWad('0.5'),
      reserves: constants.Zero,
      claimableReserves: constants.Zero,
      claimableReservesRemaining: constants.Zero,
      reserveAuctionPrice: constants.Zero,
      borrowRate: toWad(1.53),
      interestRateLastUpdated: new Date((await getBlockTime(provider)) * 1000),
      pendingInflator: constants.Zero,
    };

    // rates should stay the same
    let newRate = poolA.estimateUpdateInterest(poolStats);
    expect(newRate).toEqual(poolStats.borrowRate);

    // rates should increase
    poolStats.actualUtilization = toWad('0.8');
    poolStats.targetUtilization = toWad('0.4');
    newRate = poolA.estimateUpdateInterest(poolStats);
    expect(newRate).toEqual(wmul(poolStats.borrowRate, toWad(1.1)));

    // rates should decrease
    poolStats.actualUtilization = toWad('0.5');
    poolStats.targetUtilization = toWad('0.9');
    newRate = poolA.estimateUpdateInterest(poolStats);
    expect(newRate).toEqual(wmul(poolStats.borrowRate, toWad(0.9)));
  });

  it('should update interest rate successfully', async () => {
    const statsBefore = await pool.getStats();
    await timeJump(provider, HOUR_TO_SECONDS * 12);

    const tx = await pool.updateInterest(signerLender);
    await tx.verifyAndSubmit();

    const statsAfter = await pool.getStats();
    expect(statsBefore.borrowRate.eq(statsAfter.borrowRate)).toBe(false);
  });

  it('should use poolStats successfully', async () => {
    const stats = await poolA.getStats();

    expect(stats.poolSize?.gte(toWad('25000'))).toBe(true);
    expect(stats.loansCount).toEqual(1);
    expect(stats.minDebtAmount.gte(toWad('0'))).toBe(true);
    expect(stats.collateralization.gte(toWad('1'))).toBe(true);
    expect(stats.actualUtilization.gte(toWad('0'))).toBe(true);
    expect(stats.targetUtilization.gte(toWad('0'))).toBe(true);
    expect(stats.borrowRate).toBeBetween(toWad('0.01'), toWad('0.1'));
    expect(stats.pendingInflator).toBeBetween(toWad('1'), toWad('1.1'));
  });

  it('should use getPrices and loansInfo successfully', async () => {
    const prices = await poolA.getPrices();

    expect(prices.hpb).toEqual(indexToPrice(3236));
    expect(prices.hpbIndex).toEqual(3236);
    expect(prices.htp).toEqual(toWad('76.997041420118343231'));
    expect(prices.htpIndex).toEqual(priceToIndex(prices.htp));
    expect(prices.lup).toEqual(indexToPrice(3242));
    expect(prices.lupIndex).toEqual(3242);
    expect(prices.llb).toEqual(indexToPrice(0));
    expect(prices.llbIndex).toEqual(0);
  });

  it('should use repayDebt successfully', async () => {
    let tx = await pool.quoteApprove(signerBorrower, constants.MaxUint256);
    await submitAndVerifyTransaction(tx);

    let loan = await pool.getLoan(signerBorrower.address);
    expect(loan.debt).toBeBetween(toWad(5000), toWad(5050));
    expect(loan.neutralPrice).toBeBetween(toWad(1915), toWad(1930));

    // repay half of debt without impacting t0 neutral price
    tx = await pool.repayDebt(signerBorrower, loan.debt.div(2), constants.Zero);
    await submitAndVerifyTransaction(tx);
    loan = await pool.getLoan(signerBorrower.address);
    expect(loan.debt).toBeBetween(toWad(2500), toWad(2525));
    expect(loan.neutralPrice).toBeBetween(toWad(950), toWad(975));

    // repay remaining debt
    loan = await pool.getLoan(signerBorrower.address);
    tx = await pool.repayDebt(signerBorrower, constants.MaxUint256, loan.collateral);
    await submitAndVerifyTransaction(tx);
    loan = await pool.getLoan(signerBorrower.address);
    expect(loan.debt).toEqual(constants.Zero);
  });

  it('should use removeQuoteToken successfully', async () => {
    const quoteAmount = toWad(1);
    const bucket = await pool.getBucketByIndex(2000);
    const lpBefore = (await bucket.getStatus()).bucketLP;

    const tx = await bucket.removeQuoteToken(signerLender, quoteAmount);
    await submitAndVerifyTransaction(tx);

    const lpAfter = (await bucket.getStatus()).bucketLP;
    expect(lpBefore.gt(lpAfter)).toBe(true);
  });

  it('should raise appropriate error if removeQuoteToken fails', async () => {
    // attempt to remove liquidity from a bucket in which lender has no LP
    const bucket = await pool.getBucketByIndex(4444);
    const tx = await bucket.removeQuoteToken(signerLender, toWad('22.153'));

    expect(async () => {
      await tx.verifyAndSubmit();
    }).rejects.toThrow('NoClaim()');
  });

  it('should use moveQuoteToken successfully', async () => {
    const maxAmountToMove = toWad(5);
    const bucketIndexFrom = 2000;
    const bucketFrom = await pool.getBucketByIndex(bucketIndexFrom);
    const bucketIndexTo = 2001;
    const bucketTo = await pool.getBucketByIndex(bucketIndexTo);

    const fromLpBefore = await bucketFrom.lpBalance(signerLender.address);
    const toLpBefore = await bucketTo.lpBalance(signerLender.address);

    const tx = await bucketFrom.moveQuoteToken(signerLender, bucketIndexTo, maxAmountToMove);
    await submitAndVerifyTransaction(tx);

    const fromLpAfter = await bucketFrom.lpBalance(signerLender.address);
    const toLpAfter = await bucketTo.lpBalance(signerLender.address);
    expect(fromLpAfter.lt(fromLpBefore)).toBe(true);
    expect(toLpAfter.gt(toLpBefore)).toBe(true);
  });

  it('should use getBucketsByPriceRange successfully', async () => {
    const buckets = poolA.getBucketsByPriceRange(toWad(0.01), toWad(0.1));
    expect(buckets.length).toBe(462);
    expect(fromWad(buckets[0].price)).toBe('0.099834229041488465');
    expect(fromWad(buckets[buckets.length / 2].price)).toBe('0.031544177128155871');
    expect(fromWad(buckets[buckets.length - 1].price)).toBe('0.01001670765474992');
  });

  it('should use getBucketByIndex successfully', async () => {
    const bucket: FungibleBucket = await poolA.getBucketByIndex(3220);
    expect(bucket.toString()).toContain('TESTA-TDAI bucket 3220');
    expect(bucket.index).toEqual(3220);
    expect(bucket.price).toEqual(toWad('106.520649069543057301'));

    const bucketStatus = await bucket.getStatus();
    expect(bucketStatus.deposit.eq(constants.Zero)).toBe(true);
    expect(bucketStatus.collateral.eq(toWad(3.1))).toBe(true);
    expect(bucketStatus.bucketLP.gt(0)).toBe(true);
    // CAUTION: rate coming back as 1.000000000000000001
    expect(
      bucketStatus.exchangeRate.eq(toWad(1)) ||
        bucketStatus.exchangeRate.eq(toWad('1.000000000000000001'))
    ).toBe(true);
  });

  it('should use getBucketByPrice successfully', async () => {
    const bucket: FungibleBucket = await pool.getBucketByPrice(toWad('0.1'));
    expect(bucket.toString()).toContain(`TWETH-TDAI bucket 4618 (0.099834`);
    expect(bucket.index).toEqual(4618);
    expect(bucket.price).toEqual(toWad('0.099834229041488465'));

    const bucketStatus = await bucket.getStatus();
    expect(bucketStatus.deposit).toEqual(toWad('0'));
    expect(bucketStatus.bucketLP).toEqual(toWad('0'));
    expect(bucketStatus.exchangeRate).toEqual(toWad('1'));
  });

  it('should use lpToQuoteTokens successfully', async () => {
    const bucket = await poolA.getBucketByIndex(3261);
    expect(bucket.toString()).toContain('TESTA-TDAI bucket 3261 (86.821');

    const lpBalance = await bucket.lpBalance(signerLender.address);
    expect(lpBalance.gt(constants.Zero)).toBe(true);
    const deposit = await bucket.lpToQuoteTokens(lpBalance);
    expect(deposit.gte(toWad('5000'))).toBe(true);
  });

  it('should use lpToCollateral successfully', async () => {
    const bucket = await poolA.getBucketByIndex(3220);
    expect(bucket.toString()).toContain('TESTA-TDAI bucket 3220 (106.52');

    const lpBalance = await bucket.lpBalance(signerLender.address);
    expect(lpBalance.gt(constants.Zero)).toBe(true);
    const collateral = await bucket.lpToCollateral(lpBalance);
    expect(collateral.eq(toWad(3.1))).toBe(true);
  });

  it('should use getPosition successfully', async () => {
    // getPosition on bucket where lender has no LPB
    let bucket = await poolA.getBucketByIndex(4321);
    let position = await bucket.getPosition(signerLender.address);
    expect(position.lpBalance).toEqual(toWad(0));
    expect(position.depositRedeemable).toEqual(toWad(0));
    expect(position.collateralRedeemable).toEqual(toWad(0));
    expect(position.depositWithdrawable).toEqual(toWad(0));

    // getPosition on bucket with collateral
    bucket = await poolA.getBucketByIndex(3220);
    position = await bucket.getPosition(signerLender.address);
    expect(position.lpBalance).toEqual(toWad('330.214012115583477633'));
    expect(position.depositRedeemable).toEqual(toWad(0));
    expect(position.collateralRedeemable).toEqual(toWad('3.1'));
    expect(position.depositWithdrawable).toEqual(toWad(0));

    // getPosition on bucket below LUP
    bucket = await poolA.getBucketByIndex(3261);
    position = await bucket.getPosition(signerLender.address);
    expect(position.lpBalance).toEqual(toWad(5000));
    expect(position.depositRedeemable).toEqual(toWad(5000));
    expect(position.collateralRedeemable).toEqual(toWad(0));
    expect(position.depositWithdrawable).toEqual(position.depositRedeemable);

    // getPosition on bucket above LUP
    bucket = await poolA.getBucketByIndex(3242);
    position = await bucket.getPosition(signerLender.address);
    expect(position.lpBalance).toEqual(toWad(12000));
    expect(position.depositRedeemable).toEqual(toWad(12000));
    expect(position.collateralRedeemable).toEqual(toWad(0));
    expect(position.depositWithdrawable).toEqual(toWad(5000));
  });

  it('should use getLoan successfully', async () => {
    const loan = await poolA.getLoan(await signerBorrower.getAddress());
    expect(loan.collateralization).toBeBetween(toWad(1.2), toWad(1.3));
    expect(loan.debt).toBeBetween(toWad(10000), toWad(10000).mul(2));
    expect(loan.collateral).toEqual(toWad(130));
    expect(loan.thresholdPrice).toBeBetween(toWad(76), toWad(76).mul(2));
    expect(loan.neutralPrice).toBeBetween(toWad(80), toWad(81).mul(2));
    expect(loan.liquidationBond).toBeBetween(toWad(150), toWad(150).mul(2));
    expect(loan.isKicked).toBe(false);
  });

  it('should use estimateLoan successfully', async () => {
    // estimate change against canned loan
    let loanEstimate = await poolA.estimateLoan(signerBorrower.address, toWad(5000), toWad(68));
    const prices = await poolA.getPrices();
    expect(loanEstimate.collateralization).toBeBetween(toWad(1.2), toWad(1.3));
    expect(loanEstimate.debt).toBeBetween(toWad(15000), toWad(15000).mul(2));
    expect(loanEstimate.collateral).toEqual(toWad(130 + 68));
    expect(loanEstimate.thresholdPrice).toBeBetween(toWad(75), toWad(75).mul(2));
    expect(loanEstimate.neutralPrice).toBeBetween(toWad(79), toWad(79).mul(2));
    expect(loanEstimate.liquidationBond).toBeBetween(toWad(227), toWad(231).mul(2));
    expect(loanEstimate.lup.lte(prices.lup));
    expect(loanEstimate.lupIndex).toBeGreaterThanOrEqual(prices.lupIndex);

    // estimate 0 change against canned loan
    const loan = await poolA.getLoan(signerBorrower.address);
    loanEstimate = await poolA.estimateLoan(signerBorrower.address, toWad(0), toWad(0));
    expect(+fromWad(loanEstimate.collateralization)).toBeCloseTo(+fromWad(loan.collateralization));
    expect(+fromWad(loanEstimate.debt)).toBeCloseTo(+fromWad(loan.debt));
    expect(loanEstimate.collateral).toEqual(loan.collateral);
    expect(loanEstimate.thresholdPrice).toEqual(loan.thresholdPrice);
    expect(+fromWad(loanEstimate.neutralPrice)).toBeCloseTo(+fromWad(loan.neutralPrice));
    expect(+fromWad(loanEstimate.liquidationBond)).toBeCloseTo(+fromWad(loan.liquidationBond));
    expect(loanEstimate.lup).toEqual(prices.lup);
    expect(loanEstimate.lupIndex).toEqual(prices.lupIndex);

    // estimate with no loan, no change
    loanEstimate = await poolA.estimateLoan(signerLender2.address, toWad(0), toWad(0));
    expect(loanEstimate.collateralization).toEqual(toWad(1));
    expect(loanEstimate.debt).toEqual(toWad(0));
    expect(loanEstimate.collateral).toEqual(toWad(0));
    expect(loanEstimate.thresholdPrice).toEqual(toWad(0));
    expect(loanEstimate.neutralPrice).toEqual(toWad(0));
    expect(loanEstimate.liquidationBond).toEqual(toWad(0));
    expect(loanEstimate.lup).toEqual(prices.lup);
    expect(loanEstimate.lupIndex).toEqual(prices.lupIndex);

    // estimate new loan
    loanEstimate = await poolA.estimateLoan(signerLender2.address, toWad(1000), toWad(20));
    expect(loanEstimate.collateralization).toBeBetween(toWad(1.9), toWad(2));
    expect(loanEstimate.debt).toBeBetween(toWad(1000), toWad(1010));
    expect(loanEstimate.collateral).toEqual(toWad(20));
    expect(loanEstimate.thresholdPrice).toBeBetween(toWad(50), toWad(50).mul(2));
    expect(loanEstimate.neutralPrice).toBeBetween(toWad(50), toWad(50).mul(2));
    expect(loanEstimate.liquidationBond).toBeBetween(toWad(15), toWad(17));
    expect(loanEstimate.lup).toEqual(prices.lup);
    expect(loanEstimate.lupIndex).toEqual(prices.lupIndex);
  });

  it('should use estimateRepay successfully', async () => {
    const borrower = await signerBorrower.getAddress();
    const loan = await poolA.getLoan(borrower);
    const prices = await poolA.getPrices();

    // estimate full repay loan
    let loanEstimate = await poolA.estimateRepay(borrower, loan.debt, loan.collateral);
    expect(loanEstimate.collateralization).toEqual(toWad(1));
    expect(loanEstimate.debt).toEqual(toWad(0));
    expect(loanEstimate.collateral).toEqual(toWad(0));
    expect(loanEstimate.thresholdPrice).toEqual(toWad(0));
    expect(loanEstimate.neutralPrice).toEqual(toWad(0));
    expect(loanEstimate.liquidationBond).toEqual(toWad(0));
    expect(loanEstimate.lup.gte(prices.lup));
    expect(loanEstimate.lupIndex).toEqual(0);

    // estimate with no repay, no change
    loanEstimate = await poolA.estimateRepay(signerLender2.address, toWad(0), toWad(0));
    expect(loanEstimate.collateralization).toEqual(toWad(1));
    expect(loanEstimate.debt).toEqual(toWad(0));
    expect(loanEstimate.collateral).toEqual(toWad(0));
    expect(loanEstimate.thresholdPrice).toEqual(toWad(0));
    expect(loanEstimate.neutralPrice).toEqual(toWad(0));
    expect(loanEstimate.liquidationBond).toEqual(toWad(0));
    expect(loanEstimate.lup).toEqual(prices.lup);
    expect(loanEstimate.lupIndex).toEqual(prices.lupIndex);

    // estimate partial repay
    loanEstimate = await poolA.estimateRepay(borrower, loan.debt.div(2), loan.collateral.div(4));

    expect(+fromWad(loanEstimate.collateralization)).toBeGreaterThan(
      +fromWad(loan.collateralization)
    );
    expect(loanEstimate.debt).toEqual(wdiv(loan.debt, toWad(2)));
    expect(loanEstimate.collateral).toEqual(loan.collateral.sub(loan.collateral.div(4)));
    expect(+fromWad(loanEstimate.thresholdPrice)).toBeCloseTo(
      +fromWad(wdiv(loan.thresholdPrice, toWad(1.5)))
    );
    expect(+fromWad(loanEstimate.neutralPrice)).toBeLessThan(+fromWad(loan.neutralPrice));
    expect(+fromWad(loanEstimate.liquidationBond)).toBeLessThan(+fromWad(loan.liquidationBond));
    expect(+fromWad(loanEstimate.lup)).toBeGreaterThan(+fromWad(prices.lup));
    expect(loanEstimate.lupIndex).toBeLessThan(prices.lupIndex);

    // estimate 0 change against canned loan
    loanEstimate = await poolA.estimateRepay(borrower, toWad(0), toWad(0));
    expect(+fromWad(loanEstimate.collateralization)).toBeCloseTo(+fromWad(loan.collateralization));
    expect(+fromWad(loanEstimate.debt)).toBeCloseTo(+fromWad(loan.debt));
    expect(loanEstimate.collateral).toEqual(loan.collateral);
    expect(loanEstimate.thresholdPrice).toEqual(loan.thresholdPrice);
    expect(+fromWad(loanEstimate.neutralPrice)).toBeCloseTo(+fromWad(loan.neutralPrice));
    expect(+fromWad(loanEstimate.liquidationBond)).toBeCloseTo(+fromWad(loan.liquidationBond));
    expect(loanEstimate.lup).toEqual(prices.lup);
    expect(loanEstimate.lupIndex).toEqual(prices.lupIndex);
  });

  it('should remove all quote token without specifying amount', async () => {
    const bucket = await pool.getBucketByIndex(2000);

    // remove all liquidity from bucket
    const tx = await bucket.removeQuoteToken(signerLender);
    const receipt = await submitAndVerifyTransaction(tx);

    const eventLogs = tx.getEventLogs(receipt);
    const removeEventArgs = eventLogs.get('RemoveQuoteToken')![0].args;
    expect(removeEventArgs['lender']).toEqual(signerLender.address);
    expect(removeEventArgs['index'].eq(BigNumber.from(2000))).toBe(true);
    expect(removeEventArgs['amount']).toBeBetween(toWad(9_990), toWad(10_010));
    expect(removeEventArgs['lpRedeemed']).toBeBetween(toWad(9_990), toWad(10_010));
    expect(removeEventArgs['lup']).toEqual(indexToPrice(0));
  });

  it('should use multicall successfully', async () => {
    const quoteAmount = toWad(10);
    const bucketIndex1 = 3330;
    const bucketIndex2 = 3331;
    const allowance = 100000000;

    const bucket1 = pool.getBucketByIndex(bucketIndex1);
    const bucket2 = pool.getBucketByIndex(bucketIndex2);
    let bucketStatus1 = await bucket1.getStatus();
    let bucketStatus2 = await bucket2.getStatus();

    expect(bucketStatus1.deposit.eq(0)).toBe(true);
    expect(bucketStatus2.deposit.eq(0)).toBe(true);

    let tx = await pool.quoteApprove(signerLender, toWad(allowance));
    let response = await tx.verifyAndSubmitResponse();
    await response.wait();

    expect(response).toBeDefined();
    expect(response.hash).not.toBe('');

    tx = await pool.multicall(signerLender, [
      {
        methodName: 'addQuoteToken',
        args: [quoteAmount, bucketIndex1, await getExpiry(provider), false],
      },
      {
        methodName: 'addQuoteToken',
        args: [quoteAmount, bucketIndex2, await getExpiry(provider), false],
      },
    ]);
    response = await tx.verifyAndSubmitResponse();

    expect(response).toBeDefined();
    expect(response.hash).not.toBe('');

    bucketStatus1 = await bucket1.getStatus();
    bucketStatus2 = await bucket2.getStatus();

    expect(bucketStatus1.deposit.gt(0)).toBe(true);
    expect(bucketStatus2.deposit.gt(0)).toBe(true);
  });

  it('should use addCollateral successfully', async () => {
    const collateralAmount = toWad(0.5);
    const bucketIndex = 1234;

    let tx = await pool.collateralApprove(signerLender, collateralAmount);
    await tx.verifyAndSubmit();

    const bucket = await pool.getBucketByIndex(bucketIndex);
    let bucketStatus = await bucket.getStatus();
    const bucketCollateralBefore = bucketStatus.collateral || BigNumber.from(0);

    tx = await pool.addCollateral(signerLender, bucketIndex, collateralAmount);
    await submitAndVerifyTransaction(tx);

    bucketStatus = await bucket.getStatus();
    expect(bucketStatus.collateral).toEqual(bucketCollateralBefore.add(collateralAmount));
    expect(bucketStatus.bucketLP?.gt(0)).toBe(true);

    const lpBalance = await bucket.lpBalance(signerLender.address);
    expect(lpBalance?.gt(0)).toBe(true);
  });

  it('should reject addCollateral if expired ttl set', async () => {
    const collateralAmount = toWad(0.5);
    const bucketIndex = 1234;

    let tx = await pool.collateralApprove(signerLender, collateralAmount);
    await tx.verifyAndSubmit();

    tx = await pool.addCollateral(signerLender, bucketIndex, collateralAmount, -1);

    await expect(async () => {
      await tx.verify();
    }).rejects.toThrow('TransactionExpired()');
  });

  it('should use removeCollateral successfully', async () => {
    const collateralAmount = constants.MaxUint256;
    const bucketIndex = 1234;

    const tx = await pool.removeCollateral(signerLender, bucketIndex, collateralAmount);
    const receipt = await tx.verifyAndSubmit();

    const bucket = await pool.getBucketByIndex(bucketIndex);
    const bucketStatus = await bucket.getStatus();

    expect(receipt.transactionHash).not.toBe('');
    expect(bucketStatus.collateral.eq(0)).toBe(true);
  });

  it('removeCollateral should reject if bucket has 0 collateral balance', async () => {
    const collateralAmount = toWad(1);
    const bucketIndex = 1234;

    const bucket = await pool.getBucketByIndex(bucketIndex);
    const bucketStatus = await bucket.getStatus();
    expect(bucketStatus.collateral.eq(0)).toBe(true);

    const tx = await pool.removeCollateral(signerLender, bucketIndex, collateralAmount);

    await expect(async () => {
      await tx.verify();
    }).rejects.toThrow('InsufficientCollateral()');
  });

  it('should kick and participate in claimable reserve auction', async () => {
    let pool: FungiblePool = {} as FungiblePool;

    // Mint tokens to actors
    const signerDeployer = addAccountFromKey(DEPLOYER_KEY, provider);
    const TOKEN_C = getErc20Contract(TDAI_ADDRESS, provider);
    const TOKEN_Q = getErc20Contract(TWETH_ADDRESS, provider); // TWETH
    const TOKEN_AJNA = getErc20Contract(Config.ajnaToken, provider);
    const tokenAmount = toWad(BigNumber.from(100000));

    await TOKEN_Q.connect(signerDeployer).transfer(signerLender.address, tokenAmount);
    await TOKEN_Q.connect(signerDeployer).transfer(signerBorrower.address, tokenAmount);
    await TOKEN_C.connect(signerDeployer).transfer(signerLender.address, tokenAmount);
    await TOKEN_C.connect(signerDeployer).transfer(signerBorrower.address, tokenAmount);
    await TOKEN_AJNA.connect(signerDeployer).transfer(signerLender.address, tokenAmount);

    // Deploy pool
    let tx = await ajna.fungiblePoolFactory.deployPool(
      signerLender,
      TDAI_ADDRESS,
      TWETH_ADDRESS,
      toWad('0.05')
    );
    await tx.submit();

    pool = await ajna.fungiblePoolFactory.getPool(TDAI_ADDRESS, TWETH_ADDRESS);

    expect(pool.poolAddress).not.toBe(constants.AddressZero);
    expect(pool.collateralAddress).toBe(TDAI_ADDRESS);
    expect(pool.quoteAddress).toBe(TWETH_ADDRESS);

    // Lender adds quote
    const quoteAmount = toWad(50000);
    // ETH/DAI (collateral / quote)
    const bucket = await pool.getBucketByIndex(2632);

    tx = await pool.quoteApprove(signerLender, quoteAmount);
    await tx.verifyAndSubmit();
    tx = await bucket.addQuoteToken(signerLender, quoteAmount);
    await tx.verifyAndSubmit();

    expect((await bucket.lpBalance(signerLender.address)).gt(0)).toBe(true);

    // draw debt
    const amountToBorrow = toWad(1000);
    const collateralToPledge = toWad(100);
    tx = await pool.collateralApprove(signerBorrower, collateralToPledge);
    await submitAndVerifyTransaction(tx);
    tx = await pool.drawDebt(signerBorrower, amountToBorrow, collateralToPledge);
    await submitAndVerifyTransaction(tx);

    // wait a year (8760 hours)
    let jumpTimeSeconds = 8760 * HOUR_TO_SECONDS;
    await timeJump(provider, jumpTimeSeconds);

    // check and repay debt, expected debt value around 1053
    const repayDebtAmountInQuote = toWad(1100);
    let stats = await pool.getStats();
    expect(stats.debt.lt(repayDebtAmountInQuote)).toBe(true);
    tx = await pool.quoteApprove(signerBorrower, repayDebtAmountInQuote);
    await tx.verifyAndSubmit();
    tx = await pool.repayDebt(signerBorrower, repayDebtAmountInQuote, toWad(0));
    await submitAndVerifyTransaction(tx);
    const repaymentTime = await getBlockTime(signerBorrower);
    stats = await pool.getStats();
    expect(stats.debt.eq(toWad(0))).toBe(true);

    // check reserves before auction kicked
    const auction = pool.getClaimableReserveAuction();
    let status = await auction.getStatus();
    expect(status.lastKickTime).toEqual(new Date(0));
    expect(status.reserves.gt(toWad(8))).toBe(true);
    expect(status.claimableReserves.lte(status.reserves)).toBe(true);
    expect(status.claimableReservesRemaining.eq(constants.Zero)).toBe(true);
    expect(status.price.eq(constants.Zero)).toBe(true);
    await mine(provider);

    // kick auction
    tx = await auction.kick(signerLender);
    await submitAndVerifyTransaction(tx);
    const takeable = await auction.isTakeable();
    expect(takeable).toBe(true);

    // wait 32 hours
    jumpTimeSeconds = 32 * HOUR_TO_SECONDS;
    await timeJump(provider, jumpTimeSeconds);
    status = await auction.getStatus();
    expect(status.lastKickTime.getTime()).toBeGreaterThan(repaymentTime);
    expect(status.price).toBeBetween(toWad('0.20'), toWad('0.25'));

    // approve ajna tokens
    stats = await pool.getStats();
    const { reserveAuctionPrice, claimableReservesRemaining } = stats;
    const ajnaToBurn = wmul(claimableReservesRemaining, reserveAuctionPrice).add(toWad(1));
    tx = await pool.ajnaApprove(signerLender, ajnaToBurn);
    await tx.verifyAndSubmit();

    // take collateral and burn Ajna
    tx = await auction.takeAndBurn(signerLender);
    await submitAndVerifyTransaction(tx);
    status = await auction.getStatus();
    expect(status.lastKickTime.getTime()).toBeGreaterThan(repaymentTime);
    expect(status.claimableReserves.eq(constants.Zero)).toBe(true);
    expect(status.claimableReservesRemaining.eq(constants.Zero)).toBe(true);
  });

  it('should use bucket withdraw liquidity', async () => {
    const bucketIndex = priceToIndex(toWad(10)); // bucket 3694
    const bucket = await poolA.getBucketByIndex(bucketIndex);
    const quoteAmount = toWad(20);
    const collateralAmount = toWad('1.5'); // worth 15 quote token

    // lender deposits collateral
    let tx = await poolA.collateralApprove(signerLender, collateralAmount);
    await tx.verifyAndSubmit();
    tx = await poolA.addCollateral(signerLender, bucketIndex, collateralAmount);
    await tx.verifyAndSubmit();

    // lender2 deposits quote token
    tx = await poolA.quoteApprove(signerLender2, quoteAmount);
    await tx.verifyAndSubmit();
    tx = await bucket.addQuoteToken(signerLender2, quoteAmount);
    await tx.verifyAndSubmit();

    let bucketStatus = await bucket.getStatus();

    expect(bucketStatus.deposit.gt(0)).toBe(true);
    expect(bucketStatus.collateral.gt(0)).toBe(true);
    expect(bucketStatus.bucketLP.gt(0)).toBe(true);
    expect((await bucket.lpBalance(signerLender2.address)).gt(0)).toBe(true);

    // lender2 withdraws quote token
    tx = await bucket.withdrawLiquidity(signerLender2);
    await tx.verifyAndSubmit();
    expect((await bucket.lpBalance(signerLender2.address)).eq(0)).toBe(true);

    // lender withdraws collateral
    tx = await bucket.withdrawLiquidity(signerLender);
    await tx.verifyAndSubmit();
    expect((await bucket.lpBalance(signerLender.address)).eq(0)).toBe(true);

    bucketStatus = await bucket.getStatus();
    expect(bucketStatus.bucketLP.eq(0)).toBe(true);

    // lender withdraws with no LP
    await expect(async () => {
      await bucket.withdrawLiquidity(signerLender);
    }).rejects.toThrow('no LP in bucket');
  });

  it('should approve transferer address', async () => {
    const isApproved = await pool.isLPTransferorApproved(signerLender);
    expect(isApproved).toBe(false);

    const tx = await pool.approvePositionManagerLPTransferor(signerLender);
    await tx.verifyAndSubmit();

    const isApproved2 = await pool.isLPTransferorApproved(signerLender);
    expect(isApproved2).toBe(true);
  });

  it('should use pool withdraw liquidity', async () => {
    const bucketIndex1 = 3695;
    const bucketIndex2 = 3696;
    const bucket1 = await poolA.getBucketByIndex(bucketIndex1);
    const bucket2 = await poolA.getBucketByIndex(bucketIndex2);
    const quoteAmount = toWad(2);
    const collateralAmount = toWad('0.05');

    // lender deposits collateral to bucket1
    let tx = await poolA.collateralApprove(signerLender, collateralAmount);
    await tx.verifyAndSubmit();

    tx = await poolA.addCollateral(signerLender, bucketIndex1, collateralAmount);
    await tx.verifyAndSubmit();

    // lender deposits quote token to bucket1 and bucket2
    tx = await poolA.quoteApprove(signerLender, quoteAmount.mul(2));
    await tx.verifyAndSubmit();
    tx = await bucket1.addQuoteToken(signerLender, quoteAmount);
    await tx.verifyAndSubmit();
    tx = await bucket2.addQuoteToken(signerLender, quoteAmount);
    await tx.verifyAndSubmit();

    let bucket1Status = await bucket1.getStatus();
    expect(bucket1Status.deposit.gt(0)).toBe(true);
    expect(bucket1Status.collateral.gt(0)).toBe(true);
    expect(bucket1Status.bucketLP.gt(0)).toBe(true);
    expect((await bucket1.lpBalance(signerLender.address)).gt(0)).toBe(true);

    let bucket2Status = await bucket2.getStatus();
    expect(bucket2Status.deposit.gt(0)).toBe(true);
    expect(bucket2Status.bucketLP.gt(0)).toBe(true);
    expect((await bucket2.lpBalance(signerLender.address)).gt(0)).toBe(true);

    // lender withdraws liquidity
    tx = await poolA.withdrawLiquidity(signerLender, [bucketIndex1, bucketIndex2]);
    await tx.verifyAndSubmit();

    expect((await bucket1.lpBalance(signerLender.address)).eq(0)).toBe(true);
    expect((await bucket2.lpBalance(signerLender.address)).eq(0)).toBe(true);

    bucket1Status = await bucket1.getStatus();
    expect(bucket1Status.bucketLP.eq(0)).toBe(true);

    bucket2Status = await bucket2.getStatus();
    expect(bucket2Status.bucketLP.eq(0)).toBe(true);
  });
});
