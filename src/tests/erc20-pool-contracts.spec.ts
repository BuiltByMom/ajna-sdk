import dotenv from 'dotenv';
import { BigNumber, constants, providers } from 'ethers';
import { AjnaSDK } from '../classes/AjnaSDK';
import { Bucket } from '../classes/Bucket';
import { FungiblePool } from '../classes/FungiblePool';
import { getErc20Contract } from '../contracts/erc20';
import { addAccountFromKey } from '../utils/add-account';
import { revertToSnapshot, takeSnapshot, timeJump } from '../utils/ganache';
import { toWad } from '../utils/numeric';
import { TEST_CONFIG as config } from './test-constants';
import { getExpiry } from '../utils/time';
import { submitAndVerifyTransaction } from './test-utils';
import { indexToPrice, priceToIndex } from '../utils/pricing';

dotenv.config();

jest.setTimeout(1200000);

const WETH_ADDRESS = '0x6bc99fa34d0076377731049695180e53bcdd767f';
const TESTA_ADDRESS = '0x9b3d4d0d039cd7a32b6aa66fd88862d0f041ade8';
const QUOTE_ADDRESS = '0xc041d30870cfdeedfac49da86aefb9cffa833d65';
const LENDER_KEY = '0x2bbf23876aee0b3acd1502986da13a0f714c143fcc8ede8e2821782d75033ad1';
const DEPLOYER_KEY = '0xd332a346e8211513373b7ddcf94b2b513b934b901258a9465c76d0d9a2b676d8';
const BORROWER_KEY = '0x997f91a295440dc31eca817270e5de1817cf32fa99adc0890dc71f8667574391';
const BORROWER_2_KEY = '0xf456f1fa8e9e7ec4d24f47c0470b7bb6d8807ac5a3a7a1c5e04ef89a25aa4f51';

describe('Ajna SDK Erc20 Pool tests', () => {
  const provider = new providers.JsonRpcProvider(config.ETH_RPC_URL);
  const ajna = new AjnaSDK(provider);
  const signerLender = addAccountFromKey(LENDER_KEY, provider);
  const signerBorrower = addAccountFromKey(BORROWER_KEY, provider);
  const signerBorrower2 = addAccountFromKey(BORROWER_2_KEY, provider);
  const signerDeployer = addAccountFromKey(DEPLOYER_KEY, provider);
  const TWETH = getErc20Contract(WETH_ADDRESS, provider);
  const TDAI = getErc20Contract(QUOTE_ADDRESS, provider);
  let pool: FungiblePool = {} as FungiblePool;
  let poolA: FungiblePool = {} as FungiblePool;

  beforeAll(async () => {
    // fund lender
    let receipt = await TDAI.connect(signerDeployer).transfer(signerLender.address, toWad('10'));
    expect(receipt.transactionHash).not.toBe('');
    receipt = await TWETH.connect(signerDeployer).transfer(signerLender.address, toWad('0.5'));
    expect(receipt.transactionHash).not.toBe('');

    // fund borrower
    receipt = await TWETH.connect(signerDeployer).transfer(signerBorrower.address, toWad('10'));
    expect(receipt.transactionHash).not.toBe('');
    receipt = await TDAI.connect(signerDeployer).transfer(signerBorrower.address, toWad('2'));
    expect(receipt.transactionHash).not.toBe('');

    // fund borrower2
    receipt = await TWETH.connect(signerDeployer).transfer(signerBorrower2.address, toWad('10'));
    expect(receipt.transactionHash).not.toBe('');

    // initialize canned pool
    poolA = await ajna.factory.getPool(TESTA_ADDRESS, QUOTE_ADDRESS);
  });

  it('should confirm AjnaSDK pool successfully', async () => {
    const tx = await ajna.factory.deployPool(
      signerLender,
      WETH_ADDRESS,
      QUOTE_ADDRESS,
      toWad('0.05')
    );

    await tx.verifyAndSubmit();

    pool = await ajna.factory.getPool(WETH_ADDRESS, QUOTE_ADDRESS);

    expect(pool).toBeDefined();
    expect(pool.poolAddress).not.toBe(constants.AddressZero);
    expect(pool.collateralAddress).toBe(WETH_ADDRESS);
    expect(pool.quoteAddress).toBe(QUOTE_ADDRESS);
  });

  it('should not allow to create existing pool', async () => {
    const tx = await ajna.factory.deployPool(
      signerLender,
      WETH_ADDRESS,
      QUOTE_ADDRESS,
      toWad('0.05')
    );

    await expect(async () => {
      await tx.verify();
    }).rejects.toThrow('PoolAlreadyExists()');
  });

  it('should use addQuoteToken successfully', async () => {
    const quoteAmount = 10;
    const bucketIndex = 2000;
    const allowance = 100000000;

    let tx = await pool.quoteApprove(signerLender, toWad(allowance));
    let response = await tx.verifyAndSubmitResponse();
    await response.wait();

    expect(response).toBeDefined();
    expect(response.hash).not.toBe('');

    tx = await pool.addQuoteToken(signerLender, bucketIndex, toWad(quoteAmount));
    response = await tx.verifyAndSubmitResponse();

    expect(response).toBeDefined();
    expect(response.hash).not.toBe('');

    const receipt = await response.wait();

    expect(receipt).toBeDefined();
    expect(receipt.confirmations).toBe(1);

    const bucket = await pool.getBucketByIndex(bucketIndex);
    expect(bucket.bucketLPs?.gt(0)).toBeTruthy();

    const info = await pool.lenderInfo(signerLender.address, bucketIndex);
    expect(info.lpBalance?.gt(0)).toBeTruthy();
  });

  it('should use drawDebt successfully', async () => {
    const amountToBorrow = toWad(1.0);
    const limitIndex = 2000;
    const collateralToPledge = toWad(3.0);

    let tx = await pool.collateralApprove(signerBorrower, collateralToPledge);

    await tx.verifyAndSubmit();

    tx = await pool.drawDebt(signerBorrower, amountToBorrow, collateralToPledge, limitIndex);

    await submitAndVerifyTransaction(tx);
  });

  it('should use poolStats successfully', async () => {
    const stats = await poolA.getStats();

    expect(stats.poolSize?.gte(toWad('25000'))).toBeTruthy();
    expect(stats.loansCount).toEqual(1);
    expect(stats.minDebtAmount?.gte(toWad('0'))).toBeTruthy();
    expect(stats.collateralization?.gte(toWad('1'))).toBeTruthy();
    expect(stats.actualUtilization?.gte(toWad('0'))).toBeTruthy();
    expect(stats.targetUtilization?.gte(toWad('0'))).toBeTruthy();
  });

  it('should be able to query pool debt', async () => {
    const debtInfo = await poolA.debtInfo();

    expect(debtInfo.pendingDebt?.gte(debtInfo.accruedDebt)).toBeTruthy();
    expect(debtInfo.accruedDebt?.gte(BigNumber.from(10005))).toBeTruthy();
    expect(debtInfo.debtInAuction?.eq(BigNumber.from(0))).toBeTruthy();
  });

  it('should use getPrices and loansInfo successfully', async () => {
    const prices = await poolA.getPrices();

    expect(prices.hpb).toEqual(indexToPrice(3236));
    expect(prices.hpbIndex).toEqual(3236);
    expect(prices.htp).toEqual(toWad('76.997041420118343231'));
    expect(prices.htpIndex).toEqual(priceToIndex(prices.htp));
    expect(prices.lup).toEqual(indexToPrice(3242));
    expect(prices.lupIndex).toEqual(3242);

    const loansInfo = await poolA.loansInfo();
    expect(loansInfo.maxBorrower).toEqual(signerBorrower.address);
    expect(loansInfo.maxThresholdPrice).toEqual(prices.htp);
    expect(loansInfo.noOfLoans).toEqual(1);
  });

  it('should use repayDebt successfully', async () => {
    const collateralAmountToPull = toWad(1);
    const maxQuoteTokenAmountToRepay = toWad(2);

    let tx = await pool.quoteApprove(signerBorrower, constants.MaxUint256);
    await submitAndVerifyTransaction(tx);

    tx = await pool.repayDebt(signerBorrower, maxQuoteTokenAmountToRepay, collateralAmountToPull);

    // FIXME: full repayment produces revert with hash 0x03119322, which does not match
    // known custom errors in the ABIs
    await submitAndVerifyTransaction(tx);
  });

  it('should use removeQuoteToken successfully', async () => {
    const quoteAmount = toWad(1);
    const bucketIndex = 2000;

    const tx = await pool.removeQuoteToken(signerLender, bucketIndex, quoteAmount);

    await submitAndVerifyTransaction(tx);
  });

  it('should raise appropriate error if removeQuoteToken fails', async () => {
    // attempt to remove liquidity from a bucket in which lender has no LP
    const tx = await pool.removeQuoteToken(signerLender, 4444, toWad('22.153'));

    expect(async () => {
      await tx.verifyAndSubmit();
    }).rejects.toThrow('NoClaim()');
  });

  it('should use moveQuoteToken successfully', async () => {
    const maxAmountToMove = toWad(5);
    const bucketIndexFrom = 2000;
    const bucketIndexTo = 2001;

    const tx = await pool.moveQuoteToken(
      signerLender,
      bucketIndexFrom,
      bucketIndexTo,
      maxAmountToMove
    );

    await submitAndVerifyTransaction(tx);
  });

  it('should use getStats successfully', async () => {
    const stats = await pool.getStats();

    expect(stats).not.toBe('');
  });

  it('should use getIndexesPriceByRange onChain successfully with SHORT min/max range', async () => {
    const quoteAmount = toWad(0.5);
    const bucketIndex = 1234;

    let tx = await pool.quoteApprove(signerLender, quoteAmount);
    await tx.verifyAndSubmit();

    tx = await pool.addQuoteToken(signerLender, bucketIndex, quoteAmount);
    await tx.verifyAndSubmit();

    const buckets = await pool.getIndexesPriceByRange(toWad(0.01), toWad(0.1));

    expect(buckets.length).not.toBe(0);
  });

  it('should use getIndexesPriceByRange onChain successfully with MEDIUM min/max range', async () => {
    const buckets = await pool.getIndexesPriceByRange(toWad(0.01), toWad(1));

    expect(buckets.length).not.toBe(0);
  });

  it('should use getIndexesPriceByRange onChain successfully with LONG min/max range', async () => {
    const buckets = await pool.getIndexesPriceByRange(toWad(0.01), toWad(3));

    expect(buckets.length).not.toBe(0);
  });

  it('should use getBucketByIndex successfully', async () => {
    const bucket: Bucket = await pool.getBucketByIndex(1234);

    expect(bucket).not.toBe('');
    expect(bucket.index).toEqual(1234);
    expect(bucket.price).toEqual(toWad('2134186.913321104827263532'));
    expect(bucket.deposit?.gte(toWad('0.5'))).toBeTruthy();
    expect(bucket.bucketLPs?.gt(0)).toBeTruthy();
    expect(bucket.exchangeRate).toEqual(toWad('1'));
  });

  it('should use getBucketByPrice successfully', async () => {
    const bucket: Bucket = await pool.getBucketByPrice(toWad('0.1'));

    expect(bucket).not.toBe('');
    expect(bucket.index).toEqual(4618);
    expect(bucket.price).toEqual(toWad('0.099834229041488465'));
    expect(bucket.deposit).toEqual(toWad('0'));
    expect(bucket.bucketLPs).toEqual(toWad('0'));
    expect(bucket.exchangeRate).toEqual(toWad('1'));
  });

  it('should use lpToQuoteTokens successfully', async () => {
    const bucket = await pool.getBucketByIndex(2000);

    expect(bucket).not.toBe('');
    expect(bucket.exchangeRate?.gte(toWad('1'))).toBeTruthy();
    expect(bucket.exchangeRate?.lt(toWad('1.1'))).toBeTruthy();
    const deposit = await bucket.lpToQuoteTokens(toWad('10'));
    expect(deposit.gt(toWad('4'))).toBeTruthy();
  });

  it('should use getPosition successfully', async () => {
    // getPosition on bucket where lender has no LPB
    let position = await pool.getPosition(signerLender.address, 4321);
    expect(position.lpBalance).toEqual(toWad(0));
    expect(position.depositRedeemable).toEqual(toWad(0));
    expect(position.collateralRedeemable).toEqual(toWad(0));

    // getPosition on bucket where lender has LPB
    position = await pool.getPosition(signerLender.address, 1234);
    expect(position.lpBalance).toEqual(toWad('0.5'));
    expect(position.depositRedeemable).toEqual(toWad('0.5'));
    expect(position.collateralRedeemable).toEqual(toWad(0));
  });

  it('should use getLoan successfully', async () => {
    const loan = await pool.getLoan(await signerBorrower.getAddress());
    expect(loan.collateralization).toEqual(toWad(1));
    expect(loan.debt).toEqual(toWad(0));
    expect(loan.collateral).toEqual(toWad(2));
    expect(loan.thresholdPrice).toEqual(toWad(0));
  });

  it('should use estimateLoan successfully', async () => {
    const loanEstimate = await pool.estimateLoan(signerBorrower.address, toWad(1), toWad(5));
    const prices = await pool.getPrices();
    expect(loanEstimate.collateralization.gt(toWad(1))).toBeTruthy();
    expect(loanEstimate.debt.gte(toWad(1))).toBeTruthy();
    expect(loanEstimate.collateral.gte(toWad(5))).toBeTruthy();
    expect(loanEstimate.thresholdPrice.lt(prices.lup)).toBeTruthy();
    expect(loanEstimate.lup.lte(prices.lup));
    expect(loanEstimate.lupIndex).toBeGreaterThanOrEqual(prices.lupIndex);
  });

  it('should remove all quote token without specifying amount', async () => {
    const bucketIndex = 2000;

    // remove all liquidity from bucket
    const tx = await pool.removeQuoteToken(signerLender, bucketIndex);
    await submitAndVerifyTransaction(tx);
  });

  it('should use multicall successfully', async () => {
    const quoteAmount = 10;
    const bucketIndex = 3330;
    const bucketIndex2 = 3331;
    const allowance = 100000000;

    let bucket = await pool.getBucketByIndex(bucketIndex);
    let bucket2 = await pool.getBucketByIndex(bucketIndex2);
    let bucketDeposit = bucket.deposit || BigNumber.from(0);
    let bucket2Deposit = bucket2.deposit || BigNumber.from(0);

    expect(bucketDeposit.eq(0)).toBeTruthy();
    expect(bucket2Deposit.eq(0)).toBeTruthy();

    let tx = await pool.quoteApprove(signerLender, toWad(allowance));
    let response = await tx.verifyAndSubmitResponse();
    await response.wait();

    expect(response).toBeDefined();
    expect(response.hash).not.toBe('');

    tx = await pool.multicall(signerLender, [
      {
        methodName: 'addQuoteToken',
        args: [toWad(quoteAmount), bucketIndex, await getExpiry(provider)],
      },
      {
        methodName: 'addQuoteToken',
        args: [toWad(quoteAmount), bucketIndex2, await getExpiry(provider)],
      },
    ]);
    response = await tx.verifyAndSubmitResponse();

    expect(response).toBeDefined();
    expect(response.hash).not.toBe('');

    bucket = await pool.getBucketByIndex(bucketIndex);
    bucket2 = await pool.getBucketByIndex(bucketIndex2);
    bucketDeposit = bucket.deposit || BigNumber.from(0);
    bucket2Deposit = bucket2.deposit || BigNumber.from(0);

    expect(bucketDeposit.gt(0)).toBeTruthy();
    expect(bucket2Deposit.gt(0)).toBeTruthy();
  });

  it('should use addCollateral successfully', async () => {
    const collateralAmount = toWad(0.5);
    const bucketIndex = 1234;

    let tx = await pool.collateralApprove(signerLender, collateralAmount);
    await tx.verifyAndSubmit();

    let bucket = await pool.getBucketByIndex(bucketIndex);
    const bucketCollateralBefore = bucket.collateral || BigNumber.from(0);

    tx = await pool.addCollateral(signerLender, bucketIndex, collateralAmount);
    const receipt = await tx.verifyAndSubmit();

    expect(receipt).toBeDefined();
    expect(receipt.confirmations).toBe(1);

    bucket = await pool.getBucketByIndex(bucketIndex);
    expect(bucket.collateral).toEqual(bucketCollateralBefore.add(collateralAmount));
    expect(bucket.bucketLPs?.gt(0)).toBeTruthy();

    const info = await pool.lenderInfo(signerLender.address, bucketIndex);
    expect(info.lpBalance?.gt(0)).toBeTruthy();
  });

  it('should use lpToQuoteCollateral successfully', async () => {
    const bucketIndex = 1234;
    const bucket = await pool.getBucketByIndex(bucketIndex);
    expect(bucket).not.toBe('');

    const info = await pool.lenderInfo(signerLender.address, bucketIndex);
    const deposit = await bucket.lpToCollateral(info.lpBalance);
    expect(deposit.eq(toWad(0.5))).toBeTruthy();
  });

  it('should reject addCollateral if expired ttl set', async () => {
    const collateralAmount = toWad(0.5);
    const bucketIndex = 1234;

    let tx = await pool.collateralApprove(signerLender, collateralAmount);
    await tx.verifyAndSubmit();

    tx = await pool.addCollateral(signerLender, bucketIndex, collateralAmount, 0);

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
    const bucketCollateral = bucket.collateral ?? BigNumber.from(0);

    expect(receipt.transactionHash).not.toBe('');
    expect(bucketCollateral.eq(0)).toBeTruthy();
  });

  it('removeCollateral should reject if bucket has 0 collateral balance', async () => {
    const collateralAmount = toWad(1);
    const bucketIndex = 1234;

    const bucket = await pool.getBucketByIndex(bucketIndex);
    const bucketCollateral = bucket.collateral ?? BigNumber.from(0);
    expect(bucketCollateral.eq(0)).toBeTruthy();

    const tx = await pool.removeCollateral(signerLender, bucketIndex, collateralAmount);

    await expect(async () => {
      await tx.verify();
    }).rejects.toThrow('InsufficientCollateral()');
  });

  describe('Liquidations', () => {
    let snapshotId: number;

    beforeAll(async () => {
      // add 10 quote tokens to 2500 bucket (price 3863)
      const lowerBucketIndex = 2500;
      const quoteAmount = toWad(10);
      const approveAmount = toWad(100000);

      let tx = await pool.quoteApprove(signerLender, approveAmount);
      await submitAndVerifyTransaction(tx);

      tx = await pool.addQuoteToken(signerLender, lowerBucketIndex, quoteAmount);
      await submitAndVerifyTransaction(tx);

      // draw debt as borrower2
      const bucketIndex = 2001;
      let amountToBorrow = toWad(5);
      let collateralToPledge = toWad(0.0003);

      tx = await pool.collateralApprove(signerBorrower2, collateralToPledge);
      await submitAndVerifyTransaction(tx);

      tx = await pool.drawDebt(signerBorrower2, amountToBorrow, collateralToPledge);
      await submitAndVerifyTransaction(tx);

      // check pool lup index
      let debtInfo = await pool.debtInfo();
      let lupIndex = await pool.depositIndex(debtInfo.pendingDebt);
      expect(+lupIndex).toBe(bucketIndex);

      // check loan, make sure borrower2 threshold price is higher than lup price
      let bucket = await pool.getBucketByIndex(lupIndex);
      let lupPrice = bucket.price;
      const loan = await pool.getLoan(await signerBorrower2.getAddress());

      expect(lupPrice).toBeDefined();
      expect(lupPrice && lupPrice.gt(loan.thresholdPrice)).toBeTruthy();

      const isKickable = await pool.isKickable(signerBorrower2.address);
      expect(isKickable).toBeFalsy();

      // draw debt as another borrower to pull lup down
      amountToBorrow = toWad(10);
      collateralToPledge = toWad(1);

      tx = await pool.collateralApprove(signerBorrower, collateralToPledge);
      await submitAndVerifyTransaction(tx);

      tx = await pool.drawDebt(signerBorrower, amountToBorrow, collateralToPledge);
      await submitAndVerifyTransaction(tx);

      // check pool lup index again, make sure lup went below bucket 2001
      debtInfo = await pool.debtInfo();
      lupIndex = await pool.depositIndex(debtInfo.pendingDebt);
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

    it('should use kick and isKickable', async () => {
      const isKickable = await pool.isKickable(signerBorrower2.address);
      expect(isKickable).toBeTruthy();

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

      // wait 8 hours
      const jumpTimeSeconds = 8 * 60 * 60; // 8 hours
      await timeJump(provider, jumpTimeSeconds);

      // take
      tx = await pool.arbTake(signerLender, signerBorrower2.address, bucketIndex);
      await submitAndVerifyTransaction(tx);
    });

    it('should use deposit take', async () => {
      const bucketIndex = 2001;
      const allowance = 100000000;
      const quoteAmount = 10;

      // kick first
      let tx = await pool.kick(signerLender, signerBorrower2.address);
      await submitAndVerifyTransaction(tx);

      tx = await pool.quoteApprove(signerLender, toWad(allowance));
      await submitAndVerifyTransaction(tx);

      tx = await pool.addQuoteToken(signerLender, bucketIndex, toWad(quoteAmount));
      await submitAndVerifyTransaction(tx);

      // wait 8 hours
      const jumpTimeSeconds = 8 * 60 * 60; // 8 hours
      await timeJump(provider, jumpTimeSeconds);

      // take
      tx = await pool.depositTake(signerLender, signerBorrower2.address, bucketIndex);
      await submitAndVerifyTransaction(tx);
    });

    it('should use take', async () => {
      // kick first
      let tx = await pool.kick(signerLender, signerBorrower2.address);
      await submitAndVerifyTransaction(tx);

      // wait 8 hours
      const jumpTimeSeconds = 8 * 60 * 60; // 8 hours
      await timeJump(provider, jumpTimeSeconds);

      // take
      tx = await pool.take(signerLender, signerBorrower2.address);
      await submitAndVerifyTransaction(tx);
    });

    it('should use settle', async () => {
      let tx = await pool.kick(signerLender, signerBorrower2.address);
      await submitAndVerifyTransaction(tx);

      await expect(async () => {
        tx = await pool.settle(signerBorrower, signerBorrower2.address);
        await tx.verify();
      }).rejects.toThrow('AuctionNotClearable()');

      // wait 72 hours
      const jumpTimeSeconds = 72 * 60 * 60; // 72 hours
      await timeJump(provider, jumpTimeSeconds);

      tx = await pool.settle(signerBorrower, signerBorrower2.address);
      await submitAndVerifyTransaction(tx);
    });
  });
});
