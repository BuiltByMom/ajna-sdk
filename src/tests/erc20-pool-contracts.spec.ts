import dotenv from 'dotenv';
import { BigNumber, constants, providers } from 'ethers';
import { AjnaSDK } from '../classes/AjnaSDK';
import { Bucket } from '../classes/Bucket';
import { FungiblePool } from '../classes/FungiblePool';
import { getErc20Contract } from '../contracts/erc20';
import { addAccountFromKey } from '../utils/add-account';
import { toWad } from '../utils/numeric';
import { TEST_CONFIG as config } from './test-constants';
import { getExpiry } from '../utils/time';
import './test-fail.ts';
import { submitAndVerifyTransaction } from './test-utils';

dotenv.config();

jest.setTimeout(1200000);

const COLLATERAL_ADDRESS = '0x97112a824376a2672a61c63c1c20cb4ee5855bc7';
const QUOTE_ADDRESS = '0xc91261159593173b5d82e1024c3e3529e945dc28';
const LENDER_KEY = '0x2bbf23876aee0b3acd1502986da13a0f714c143fcc8ede8e2821782d75033ad1';
const DEPLOYER_KEY = '0xd332a346e8211513373b7ddcf94b2b513b934b901258a9465c76d0d9a2b676d8';
const BORROWER_KEY = '0x997f91a295440dc31eca817270e5de1817cf32fa99adc0890dc71f8667574391';

describe('Ajna SDK Erc20 Pool tests', () => {
  const provider = new providers.JsonRpcProvider(config.ETH_RPC_URL);
  const ajna = new AjnaSDK(provider);
  const signerLender = addAccountFromKey(LENDER_KEY, provider);
  const signerBorrower = addAccountFromKey(BORROWER_KEY, provider);
  let pool: FungiblePool = {} as FungiblePool;

  beforeAll(async () => {
    // mint tokens to actors
    const signerDeployer = addAccountFromKey(DEPLOYER_KEY, provider);
    const TWETH = getErc20Contract(COLLATERAL_ADDRESS, provider);
    const receipt = await TWETH.connect(signerDeployer).transfer(
      signerBorrower.address,
      toWad(BigNumber.from('10'))
    );
    expect(receipt.transactionHash).not.toBe('');
  });

  it('should confirm AjnaSDK pool succesfully', async () => {
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

  it('should use addQuoteToken succesfully', async () => {
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

    const info = await pool.lenderInfo(signerLender, signerLender.address, bucketIndex);
    expect(info.lpBalance?.gt(0)).toBeTruthy();
  });

  it('should use drawDebt succesfully', async () => {
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
    expect(stats.loansCount?.eq(BigNumber.from(1))).toBeTruthy();
    expect(stats.minDebtAmount?.gte(toWad('0'))).toBeTruthy();
    expect(stats.collateralization?.gte(toWad('1'))).toBeTruthy();
    expect(stats.actualUtilization?.gte(toWad('0.01'))).toBeTruthy();
    expect(stats.targetUtilization?.gte(toWad('0'))).toBeTruthy();
  });

  it('should use repayDebt succesfully', async () => {
    const collateralAmountToPull = toWad(1);
    const maxQuoteTokenAmountToRepay = toWad(1);

    let tx = await pool.quoteApprove(signerBorrower, maxQuoteTokenAmountToRepay);
    await tx.verifyAndSubmit();

    tx = await pool.repayDebt(signerBorrower, maxQuoteTokenAmountToRepay, collateralAmountToPull);

    await submitAndVerifyTransaction(tx);
  });

  it('should use removeQuoteToken succesfully', async () => {
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

  it('should use moveQuoteToken succesfully', async () => {
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

  it('should use getLoan succesfully', async () => {
    const loan = await pool.getLoan(await signerBorrower.getAddress());

    expect(loan.collateralization.toString()).not.toBe('');
  });

  it('should use getPrices succesfully', async () => {
    const prices = await pool.getPrices();

    expect(prices).not.toBe('');
  });

  it('should use getStats succesfully', async () => {
    const stats = await pool.getStats();

    expect(stats).not.toBe('');
  });

  it('should use getIndexesPriceByRange onChain succesfully with SHORT min/max range', async () => {
    const quoteAmount = toWad(0.5);
    const bucketIndex = 1234;

    let tx = await pool.quoteApprove(signerLender, quoteAmount);
    await tx.verifyAndSubmit();

    tx = await pool.addQuoteToken(signerLender, bucketIndex, quoteAmount);
    await tx.verifyAndSubmit();

    const buckets = await pool.getIndexesPriceByRange(toWad(0.01), toWad(0.1));

    expect(buckets.length).not.toBe(0);
  });

  it('should use getIndexesPriceByRange onChain succesfully with MEDIUM min/max range', async () => {
    const buckets = await pool.getIndexesPriceByRange(toWad(0.01), toWad(1));

    expect(buckets.length).not.toBe(0);
  });

  it('should use getIndexesPriceByRange onChain succesfully with LONG min/max range', async () => {
    const buckets = await pool.getIndexesPriceByRange(toWad(0.01), toWad(3));

    expect(buckets.length).not.toBe(0);
  });

  it('should use getBucketByIndex succesfully', async () => {
    const bucket: Bucket = await pool.getBucketByIndex(1234);

    expect(bucket).not.toBe('');
    expect(bucket.index).toEqual(1234);
    expect(bucket.price).toEqual(toWad('2134186.913321104827263532'));
    expect(bucket.deposit?.gte(toWad('0.5'))).toBeTruthy();
    expect(bucket.bucketLPs?.gt(0)).toBeTruthy();
    expect(bucket.exchangeRate).toEqual(toWad('1'));
  });

  it('should use getBucketByPrice succesfully', async () => {
    const bucket: Bucket = await pool.getBucketByPrice(toWad('0.1'));

    expect(bucket).not.toBe('');
    expect(bucket.index).toEqual(4618);
    expect(bucket.price).toEqual(toWad('0.099834229041488465'));
    expect(bucket.deposit).toEqual(toWad('0'));
    expect(bucket.bucketLPs).toEqual(toWad('0'));
    expect(bucket.exchangeRate).toEqual(toWad('1'));
  });

  it('should use lpsToQuoteTokens succesfully', async () => {
    const bucket = await pool.getBucketByIndex(2000);

    expect(bucket).not.toBe('');
    expect(bucket.exchangeRate?.gte(toWad('1'))).toBeTruthy();
    expect(bucket.exchangeRate?.lt(toWad('1.1'))).toBeTruthy();
    const deposit = await bucket.lpsToQuoteTokens(toWad('10'));
    expect(deposit.gt(toWad('4'))).toBeTruthy();
  });

  it('should use getPosition succesfully', async () => {
    const position = await pool.getPosition(signerLender, 1234, toWad(0.1));

    expect(position).not.toBe('');
  });

  it('should use estimateLoan succesfully', async () => {
    const estimateLoan = await pool.estimateLoan(signerLender, toWad(1), toWad(5));

    expect(estimateLoan).not.toBe('');
  });

  it('should remove all quote token without specifying amount', async () => {
    const bucketIndex = 2000;

    // remove all liquidity from bucket
    const tx = await pool.removeQuoteToken(signerLender, bucketIndex);
    await submitAndVerifyTransaction(tx);
  });

  it('should use multicall succesfully', async () => {
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

  it('should use addCollateral succesfully', async () => {
    const collateralAmount = toWad(0.5);
    const bucketIndex = 1234;

    let tx = await pool.collateralApprove(signerLender, collateralAmount);
    await tx.verifyAndSubmit();

    let bucket = await pool.getBucketByIndex(bucketIndex);
    const bucketCollateralBefore = bucket.collateral || BigNumber.from(0);

    tx = await pool.addCollateral(signerLender, collateralAmount, bucketIndex);
    const receipt = await tx.verifyAndSubmit();

    expect(receipt).toBeDefined();
    expect(receipt.confirmations).toBe(1);

    bucket = await pool.getBucketByIndex(bucketIndex);
    expect(bucket.collateral).toEqual(bucketCollateralBefore.add(collateralAmount));
    expect(bucket.bucketLPs?.gt(0)).toBeTruthy();

    const info = await pool.lenderInfo(signerLender, signerLender.address, bucketIndex);
    expect(info.lpBalance?.gt(0)).toBeTruthy();
  });

  it('should reject addCollateral if expired ttl set', async () => {
    const collateralAmount = toWad(0.5);
    const bucketIndex = 1234;

    let tx = await pool.collateralApprove(signerLender, collateralAmount);
    await tx.verifyAndSubmit();

    tx = await pool.addCollateral(signerLender, collateralAmount, bucketIndex, 0);

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
});
