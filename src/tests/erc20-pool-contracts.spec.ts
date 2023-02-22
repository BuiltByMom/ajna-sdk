import { AjnaSDK } from '../classes/ajna';
import { Bucket } from '../classes/bucket';
import { FungiblePool } from '../classes/fungible-pool';
import { TEST_CONFIG as config } from '../constants/config';
import { getErc20Contract } from '../contracts/erc20';
import addAccount from '../utils/add-account';
import { toWad } from '../utils/numeric';
import dotenv from 'dotenv';
import { BigNumber, providers } from 'ethers';

dotenv.config();

jest.setTimeout(1200000);

describe('Ajna SDK Erc20 Pool tests', () => {
  const provider = new providers.JsonRpcProvider(config.ETH_RPC_URL);
  const ajna = new AjnaSDK(provider);
  const signerLender = addAccount(config.LENDER_KEY, provider);
  const signerBorrower = addAccount(config.BORROWER_KEY, provider);
  let pool: FungiblePool = {} as FungiblePool;

  beforeAll(async () => {
    // mint tokens to actors
    const signerDeployer = addAccount(config.DEPLOYER_KEY, provider);
    const TWETH = getErc20Contract(config.COLLATERAL_ADDRESS, provider);
    const receipt = await TWETH.connect(signerDeployer).transfer(
      signerBorrower.address,
      toWad(BigNumber.from('10'))
    );
    expect(receipt.transactionHash).not.toBe('');
  });

  it('should confirm AjnaSDK pool succesfully', async () => {
    pool = await ajna.factory.deployPool({
      signer: signerLender,
      collateralAddress: config.COLLATERAL_ADDRESS,
      quoteAddress: config.QUOTE_ADDRESS,
      interestRate: '0.05',
    });

    expect(pool.poolAddress).not.toBe('');
  });

  it('should use addQuoteToken succesfully', async () => {
    const quoteAmount = 10;
    const bucketIndex = 2000;
    const allowance = 100000000;

    await pool.quoteApprove({
      signer: signerLender,
      allowance,
    });

    const receipt = await pool.addQuoteToken({
      signer: signerLender,
      amount: quoteAmount,
      bucketIndex,
      ttlSeconds: null,
    });

    expect(receipt.transactionHash).not.toBe('');
  });

  it('should use drawDebt succesfully', async () => {
    const allowance = 100000;
    const amountToBorrow = 1;
    const collateralToPledge = 3;
    const limitIndex = 2000;

    await pool.collateralApprove({
      signer: signerBorrower,
      allowance,
    });

    const receipt = await pool.drawDebt({
      signer: signerBorrower,
      amountToBorrow,
      limitIndex,
      collateralToPledge,
    });

    expect(receipt.transactionHash).not.toBe('');
  });

  it('should use repayDebt succesfully', async () => {
    const allowance = 100000000;
    const collateralAmountToPull = 1;
    const maxQuoteTokenAmountToRepay = 1;

    await pool.quoteApprove({
      signer: signerBorrower,
      allowance,
    });

    const receipt = await pool.repayDebt({
      signer: signerBorrower,
      maxQuoteTokenAmountToRepay,
      collateralAmountToPull,
      limitIndex: null,
    });

    expect(receipt.transactionHash).not.toBe('');
  });

  it('should use removeQuoteToken succesfully', async () => {
    const allowance = 100000;
    const quoteAmount = 1;
    const bucketIndex = 2000;

    await pool.quoteApprove({
      signer: signerLender,
      allowance,
    });

    const receipt = await pool.removeQuoteToken({
      signer: signerLender,
      maxAmount: quoteAmount,
      bucketIndex,
    });

    expect(receipt.transactionHash).not.toBe('');
  });

  it('should use moveQuoteToken succesfully', async () => {
    const allowance = 100000;
    const maxAmountToMove = 5;
    const bucketIndexFrom = 2000;
    const bucketIndexTo = 2001;

    await pool.quoteApprove({
      signer: signerLender,
      allowance,
    });

    const receipt = await pool.moveQuoteToken({
      signer: signerLender,
      maxAmountToMove,
      fromIndex: bucketIndexFrom,
      toIndex: bucketIndexTo,
      ttlSeconds: null,
    });

    expect(receipt.transactionHash).not.toBe('');
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
    const quoteAmount = 0.5;
    const bucketIndex = 1234;
    const allowance = 100000000;

    await pool.quoteApprove({
      signer: signerLender,
      allowance,
    });

    await pool.addQuoteToken({
      signer: signerLender,
      amount: quoteAmount,
      bucketIndex,
      ttlSeconds: null,
    });

    const buckets = await pool.getIndexesPriceByRange(0.01, 0.1);

    expect(buckets.length).not.toBe(0);
  });

  it('should use getIndexesPriceByRange onChain succesfully with MEDIUM min/max range', async () => {
    const buckets = await pool.getIndexesPriceByRange(0.01, 1);

    expect(buckets.length).not.toBe(0);
  });

  it('should use getIndexesPriceByRange onChain succesfully with LONG min/max range', async () => {
    const buckets = await pool.getIndexesPriceByRange(0.01, 3);

    expect(buckets.length).not.toBe(0);
  });

  it('should use getBucketByIndex succesfully', async () => {
    const bucket: Bucket = await pool.getBucketByIndex(1234);

    expect(bucket).not.toBe('');
    expect(bucket.index).toEqual(1234);
    expect(bucket.price).toEqual(toWad('2134186.913321104827263532'));
    console.info('bucket.deposit ', bucket.deposit);
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
    const position = await pool.getPosition({
      signer: signerLender,
      withdrawalAmount: 0.1,
      bucketIndex: 1234,
    });

    expect(position).not.toBe('');
  });

  it('should use estimateLoan succesfully', async () => {
    const estimateLoan = await pool.estimateLoan({
      signer: signerLender,
      debtAmount: 1,
      collateralAmount: 5,
    });

    expect(estimateLoan).not.toBe('');
  });
});
