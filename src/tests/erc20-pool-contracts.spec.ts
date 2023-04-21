import dotenv from 'dotenv';
import { BigNumber, constants, providers } from 'ethers';
import { AjnaSDK } from '../classes/AjnaSDK';
import { Bucket } from '../classes/Bucket';
import { FungiblePool } from '../classes/FungiblePool';
import { getErc20Contract } from '../contracts/erc20';
import { addAccountFromKey } from '../utils/add-account';
import { revertToSnapshot, takeSnapshot } from '../utils/ganache';
import { toWad } from '../utils/numeric';
import { TEST_CONFIG as config } from './test-constants';
import { getExpiry } from '../utils/time';
import { submitAndVerifyTransaction } from './test-utils';
import { indexToPrice, priceToIndex } from '../utils/pricing';

dotenv.config();

jest.setTimeout(1200000);

const COLLATERAL_ADDRESS = '0x97112a824376a2672a61c63c1c20cb4ee5855bc7';
const QUOTE_ADDRESS = '0xc91261159593173b5d82e1024c3e3529e945dc28';
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
  let pool: FungiblePool = {} as FungiblePool;

  beforeAll(async () => {
    // transfer minted tokens to actors
    const TWETH = getErc20Contract(COLLATERAL_ADDRESS, provider);
    let receipt = await TWETH.connect(signerDeployer).transfer(
      signerBorrower.address,
      toWad(BigNumber.from('10'))
    );
    expect(receipt.transactionHash).not.toBe('');
    const TDAI = getErc20Contract(QUOTE_ADDRESS, provider);
    receipt = await TDAI.connect(signerDeployer).transfer(
      signerBorrower.address,
      toWad(BigNumber.from('2'))
    );
    expect(receipt.transactionHash).not.toBe('');
    receipt = await TWETH.connect(signerDeployer).transfer(
      signerBorrower2.address,
      toWad(BigNumber.from('10'))
    );
    expect(receipt.transactionHash).not.toBe('');
  });

  it('should confirm AjnaSDK pool successfully', async () => {
    const tx = await ajna.factory.deployPool(
      signerLender,
      COLLATERAL_ADDRESS,
      QUOTE_ADDRESS,
      toWad('0.05')
    );

    await tx.verifyAndSubmit();

    pool = await ajna.factory.getPool(COLLATERAL_ADDRESS, QUOTE_ADDRESS);

    expect(pool).toBeDefined();
    expect(pool.poolAddress).not.toBe(constants.AddressZero);
    expect(pool.collateralAddress).toBe(COLLATERAL_ADDRESS);
    expect(pool.quoteAddress).toBe(QUOTE_ADDRESS);
  });

  it('should not allow to create existing pool', async () => {
    const tx = await ajna.factory.deployPool(
      signerLender,
      COLLATERAL_ADDRESS,
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
    const stats = await pool.getStats();

    expect(stats.poolSize?.gte(toWad('10'))).toBeTruthy();
    expect(stats.loansCount).toEqual(1);
    expect(stats.minDebtAmount?.gte(toWad('0'))).toBeTruthy();
    expect(stats.collateralization?.gte(toWad('1'))).toBeTruthy();
    expect(stats.actualUtilization?.gte(toWad('0.01'))).toBeTruthy();
    expect(stats.targetUtilization?.gte(toWad('0'))).toBeTruthy();
  });

  it('should be able to query pool debt', async () => {
    const debtInfo = await pool.debtInfo();

    expect(debtInfo.pendingDebt?.gte(debtInfo.accruedDebt)).toBeTruthy();
    expect(debtInfo.accruedDebt?.gte(BigNumber.from(1))).toBeTruthy();
    expect(debtInfo.debtInAuction?.eq(BigNumber.from(0))).toBeTruthy();
  });

  it('should use getPrices and loansInfo successfully', async () => {
    const prices = await pool.getPrices();

    expect(prices.hpb).toEqual(indexToPrice(2000));
    expect(prices.hpbIndex).toEqual(2000);
    expect(prices.htp).toEqual(toWad('0.333653846153846154'));
    expect(prices.htpIndex).toEqual(priceToIndex(prices.htp));
    expect(prices.lup).toEqual(indexToPrice(2000));
    expect(prices.lupIndex).toEqual(2000);

    const loansInfo = await pool.loansInfo();
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

  it('should use lpsToQuoteTokens successfully', async () => {
    const bucket = await pool.getBucketByIndex(2000);

    expect(bucket).not.toBe('');
    expect(bucket.exchangeRate?.gte(toWad('1'))).toBeTruthy();
    expect(bucket.exchangeRate?.lt(toWad('1.1'))).toBeTruthy();
    const deposit = await bucket.lpsToQuoteTokens(toWad('10'));
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

  it('should use lpsToQuoteCollateral successfully', async () => {
    const bucketIndex = 1234;
    const bucket = await pool.getBucketByIndex(bucketIndex);
    expect(bucket).not.toBe('');

    const info = await pool.lenderInfo(signerLender.address, bucketIndex);
    const deposit = await bucket.lpsToCollateral(info.lpBalance);
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
      await revertToSnapshot(provider, snapshotId);
    });

    it('should use kick and isKickable ', async () => {
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
  });
});
