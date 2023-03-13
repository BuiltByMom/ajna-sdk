import dotenv from 'dotenv';
import { BigNumber, providers } from 'ethers';
import { AjnaSDK } from '../classes/ajna';
import { Bucket } from '../classes/bucket';
import { FungiblePool } from '../classes/fungible-pool';
import { TEST_CONFIG as config } from '../constants/config';
import { getErc20Contract } from '../contracts/erc20';
import { addAccountFromKey } from '../utils/add-account';
import { toWad } from '../utils/numeric';
import './test-utils.ts';

dotenv.config();

jest.setTimeout(1200000);

describe('Ajna SDK Erc20 Pool tests', () => {
  const provider = new providers.JsonRpcProvider(config.ETH_RPC_URL);
  const ajna = new AjnaSDK(provider);
  const signerLender = addAccountFromKey(config.LENDER_KEY, provider);
  const signerBorrower = addAccountFromKey(config.BORROWER_KEY, provider);
  let pool: FungiblePool = {} as FungiblePool;

  beforeAll(async () => {
    // mint tokens to actors
    const signerDeployer = addAccountFromKey(config.DEPLOYER_KEY, provider);
    const TWETH = getErc20Contract(config.COLLATERAL_ADDRESS, provider);
    const receipt = await TWETH.connect(signerDeployer).transfer(
      signerBorrower.address,
      toWad(BigNumber.from('10'))
    );
    expect(receipt.transactionHash).not.toBe('');
  });

  it('should confirm AjnaSDK pool succesfully', async () => {
    const tx = await ajna.factory.deployPool({
      signer: signerLender,
      collateralAddress: config.COLLATERAL_ADDRESS,
      quoteAddress: config.QUOTE_ADDRESS,
      interestRate: toWad('0.05'),
    });

    const response = await tx.verifyAndSubmit();
    await response.wait();

    pool = await ajna.factory.getPool(
      config.COLLATERAL_ADDRESS,
      config.QUOTE_ADDRESS
    );

    expect(pool).toBeDefined();
    expect(pool.poolAddress).not.toBe('');
    expect(pool.collateralAddress).toBe(config.COLLATERAL_ADDRESS);
    expect(pool.quoteAddress).toBe(config.QUOTE_ADDRESS);
  });

  it('should not allow to create existing pool', async () => {
    const tx = await ajna.factory.deployPool({
      signer: signerLender,
      collateralAddress: config.COLLATERAL_ADDRESS,
      quoteAddress: config.QUOTE_ADDRESS,
      interestRate: toWad('0.05'),
    });

    expect(async () => await tx.submit()).toThrow();
  });

  it('should use addQuoteToken succesfully', async () => {
    const quoteAmount = 10;
    const bucketIndex = 2000;
    const allowance = 100000000;

    await pool.quoteApprove({
      signer: signerLender,
      allowance: toWad(allowance),
    });

    const receipt = await pool.addQuoteToken({
      signer: signerLender,
      amount: toWad(quoteAmount),
      bucketIndex,
      ttlSeconds: null,
    });

    expect(receipt.transactionHash).not.toBe('');
  });

  it('should use drawDebt succesfully', async () => {
    const amountToBorrow = toWad(1.0);
    const limitIndex = 2000;
    const collateralToPledge = toWad(3.0);

    await pool.collateralApprove({
      signer: signerBorrower,
      allowance: collateralToPledge,
    });

    const receipt = await pool.drawDebt({
      signer: signerBorrower,
      amountToBorrow,
      limitIndex,
      collateralToPledge,
    });

    expect(receipt.transactionHash).not.toBe('');
  });

  // it('should raise expected exception upon ajna revert', async () => {
  //   try {
  //     // try to draw debt with insufficient collateral;
  //     // pool should revert with LimitIndexExceeded
  //     await pool.drawDebt({
  //       signer: signerBorrower,
  //       amountToBorrow: 1,
  //       limitIndex: 0,
  //       collateralToPledge: 3,
  //     });
  //     fail('previous call should have raised exception');
  //   } catch (error: any) {
  //     console.info(error);
  //     // console.info('error.receipt: ', error.receipt);

  //     // This won't work in TypeScript
  //     // const revertData = error.data;
  //     // const decodedError = pool.contract.interface.parseError(revertData);
  //     // console.info('decodedError: ', decodedError);
  //   }
  //   fail('just testing');
  // });

  // it('should raise expected exception upon external revert', async () => {
  //   try {
  //     // try to pledge more collateral than the borrower has;
  //     // token should revert with transfer error
  //     await pool.drawDebt({
  //       signer: signerBorrower,
  //       amountToBorrow: toWad(0),
  //       limitIndex: null,
  //       collateralToPledge: toWad(BigNumber.from('11')),
  //     });
  //     fail('previous call should have raised exception');
  //   } catch (error) {
  //     // console.info(typeof error);      // returns "object"; not helpful
  //     // console.info(error.constructor); // doesn't work
  //     // console.info(error);
  //   }
  // });

  it('should use repayDebt succesfully', async () => {
    const collateralAmountToPull = toWad(1);
    const maxQuoteTokenAmountToRepay = toWad(1);

    await pool.quoteApprove({
      signer: signerBorrower,
      allowance: maxQuoteTokenAmountToRepay,
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
    const quoteAmount = toWad(1);
    const bucketIndex = 2000;

    const receipt = await pool.removeQuoteToken({
      signer: signerLender,
      maxAmount: quoteAmount,
      bucketIndex,
    });

    expect(receipt.transactionHash).not.toBe('');
  });

  it('should use moveQuoteToken succesfully', async () => {
    const maxAmountToMove = toWad(5);
    const bucketIndexFrom = 2000;
    const bucketIndexTo = 2001;

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
    const quoteAmount = toWad(0.5);
    const bucketIndex = 1234;

    await pool.quoteApprove({
      signer: signerLender,
      allowance: quoteAmount,
    });

    await pool.addQuoteToken({
      signer: signerLender,
      amount: quoteAmount,
      bucketIndex,
      ttlSeconds: null,
    });

    const buckets = await pool.getIndexesPriceByRange({
      minPrice: toWad(0.01),
      maxPrice: toWad(0.1),
    });

    expect(buckets.length).not.toBe(0);
  });

  it('should use getIndexesPriceByRange onChain succesfully with MEDIUM min/max range', async () => {
    const buckets = await pool.getIndexesPriceByRange({
      minPrice: toWad(0.01),
      maxPrice: toWad(1),
    });

    expect(buckets.length).not.toBe(0);
  });

  it('should use getIndexesPriceByRange onChain succesfully with LONG min/max range', async () => {
    const buckets = await pool.getIndexesPriceByRange({
      minPrice: toWad(0.01),
      maxPrice: toWad(3),
    });

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
    const position = await pool.getPosition({
      signer: signerLender,
      bucketIndex: 1234,
      proposedWithdrawal: toWad(0.1),
    });

    expect(position).not.toBe('');
  });

  it('should use estimateLoan succesfully', async () => {
    const estimateLoan = await pool.estimateLoan({
      signer: signerLender,
      debtAmount: toWad(1),
      collateralAmount: toWad(5),
    });

    expect(estimateLoan).not.toBe('');
  });
});
