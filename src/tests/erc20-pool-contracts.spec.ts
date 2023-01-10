import { AjnaSDK } from '../classes/ajna';
import { FungiblePool } from '../classes/fungible-pool';
import { TEST_CONFIG as config } from '../constants/config';
import addAccount from '../utils/add-account';
import dotenv from 'dotenv';
import { providers } from 'ethers';

dotenv.config();

jest.setTimeout(1200000);

describe('Ajna SDK Erc20 Pool tests', () => {
  const provider = new providers.JsonRpcProvider();
  const ajna = new AjnaSDK(provider);
  const signerLender = addAccount(config.LENDER_KEY, provider);
  const signerBorrower = addAccount(config.BORROWER_KEY, provider);
  let pool: FungiblePool = {} as FungiblePool;

  it('should confirm AjnaSDK pool succesfully', async () => {
    pool = await ajna.factory.deployPool({
      signer: signerLender,
      collateralAddress: config.COLLATERAL_ADDRESS,
      quoteAddress: config.QUOTE_ADDRESS,
      interestRate: '0.05'
    });

    expect(pool.poolAddress).not.toBe('');
  });

  it('should use addLiquidity succesfully', async () => {
    const quoteAmount = 10;
    const bucketIndex = 2000;
    const allowance = 100000000;

    await pool.quoteApprove({
      signer: signerLender,
      allowance
    });

    const receipt = await pool.addLiquidity({
      signer: signerLender,
      amount: quoteAmount,
      bucketIndex
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
      allowance
    });

    const receipt = await pool.drawDebt({
      signer: signerBorrower,
      borrowerAddress: config.BORROWER,
      amountToBorrow,
      collateralToPledge,
      limitIndex
    });

    expect(receipt.transactionHash).not.toBe('');
  });

  it('should use repayDebt succesfully', async () => {
    const allowance = 100000000;
    const collateralAmountToPull = 1;
    const maxQuoteTokenAmountToRepay = 1;

    await pool.quoteApprove({
      signer: signerBorrower,
      allowance
    });

    const receipt = await pool.repayDebt({
      signer: signerBorrower,
      collateralAmountToPull,
      maxQuoteTokenAmountToRepay
    });

    expect(receipt.transactionHash).not.toBe('');
  });

  it('should use removeLiquidity succesfully', async () => {
    const allowance = 100000;
    const quoteAmount = 1;
    const bucketIndex = 2000;

    await pool.quoteApprove({
      signer: signerLender,
      allowance
    });

    const receipt = await pool.removeLiquidity({
      signer: signerLender,
      maxAmount: quoteAmount,
      bucketIndex
    });

    expect(receipt.transactionHash).not.toBe('');
  });

  it('should use moveLiquidity succesfully', async () => {
    const allowance = 100000;
    const maxAmountToMove = 5;
    const bucketIndexFrom = 2000;
    const bucketIndexTo = 2001;

    await pool.quoteApprove({
      signer: signerLender,
      allowance
    });

    const receipt = await pool.moveLiquidity({
      signer: signerLender,
      maxAmountToMove,
      fromIndex: bucketIndexFrom,
      toIndex: bucketIndexTo
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
      allowance
    });

    await pool.addQuoteToken({
      signer: signerLender,
      amount: quoteAmount,
      bucketIndex
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
    const bucket = await pool.getBucketByIndex(1234);

    expect(bucket).not.toBe('');
  });

  it('should use getBucketByPrice succesfully', async () => {
    const bucket = await pool.getBucketByPrice(0.1);

    expect(bucket).not.toBe('');
  });

  it('should use lpsToQuoteTokens succesfully', async () => {
    const bucket = await pool.utils.lpsToQuoteTokens(10, 2000);

    expect(bucket).not.toBe('');
  });

  it('should use getPosition succesfully', async () => {
    const position = await pool.getPosition({
      signer: signerLender,
      withdrawalAmount: 0.1,
      bucketIndex: 1234
    });

    expect(position).not.toBe('');
  });

  it('should use estimateLoan succesfully', async () => {
    const estimateLoan = await pool.estimateLoan({
      signer: signerLender,
      debtAmount: 1,
      collateralAmount: 5
    });

    expect(estimateLoan).not.toBe('');
  });
});
