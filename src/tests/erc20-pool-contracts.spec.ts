/* eslint-disable no-console */
import { AjnaSDK } from '../classes/ajna';
import { Pool } from '../classes/pool';
import { TEST_CONFIG as config } from '../constants/config';
import {
  getBorrowerCollateralBalance,
  getBorrowerQuoteBalance
} from '../contracts/get-generic-contract';
import addAccount from '../utils/add-account';
import toWei from '../utils/to-wei';
import dotenv from 'dotenv';
import { providers } from 'ethers';

dotenv.config();

jest.setTimeout(120000);

describe('Ajna SDK Erc20 Pool tests', () => {
  const provider = new providers.JsonRpcProvider();
  const ajna = new AjnaSDK(provider);
  const signerLender = addAccount(config.LENDER_KEY, provider);
  const signerBorrower = addAccount(config.BORROWER_KEY, provider);
  let pool: Pool = {} as Pool;

  it('should confirm AjnaSDK pool succesfully', async () => {
    pool = await ajna.factory.deployPool({
      signer: signerLender,
      collateralAddress: config.COLLATERAL_ADDRESS,
      quoteAddress: config.QUOTE_ADDRESS,
      interestRate: '0.05'
    });

    expect(pool.poolAddress).not.toBe('');
  });

  it('should use pledgeCollateral succesfully', async () => {
    const allowance = 1000000000;
    const collateralToPledge = 100;

    await pool.collateralApprove({
      signer: signerBorrower,
      allowance
    });

    const receipt = await pool.pledgeCollateral({
      signer: signerBorrower,
      to: config.BORROWER,
      collateralToPledge
    });

    expect(receipt.transactionHash).not.toBe('');
  });

  it('should use addQuoteToken succesfully', async () => {
    const quoteAmount = 10;
    const bucketIndex = 2000;
    const allowance = 100000000;

    await pool.quoteApprove({
      signer: signerLender,
      allowance
    });

    const receipt = await pool.addQuoteToken({
      signer: signerLender,
      amount: quoteAmount,
      bucketIndex
    });

    expect(receipt.transactionHash).not.toBe('');
  });

  it('should use borrow quote tokens succesfully', async () => {
    const bucketIndex = 5000;
    const amountToBorrow = 10;
    const currentQuotaBalance = await getBorrowerQuoteBalance({
      provider: ajna.provider,
      quoteAddress: config.QUOTE_ADDRESS,
      tokenAddress: config.BORROWER
    });

    await pool.borrow({
      signer: signerBorrower,
      amount: amountToBorrow,
      bucketIndex
    });

    const updatedQuotaBalance = await getBorrowerQuoteBalance({
      provider: ajna.provider,
      quoteAddress: config.QUOTE_ADDRESS,
      tokenAddress: config.BORROWER
    });

    expect(Number(updatedQuotaBalance)).toBe(
      Number(currentQuotaBalance) + Number(toWei(amountToBorrow))
    );
  });

  it('should use repay loan with debt succesfully', async () => {
    const allowance = 100000000;
    const amountToRepay = 10;

    await pool.quoteApprove({
      signer: signerBorrower,
      allowance
    });

    const receipt = await pool.repay({
      signer: signerBorrower,
      amount: amountToRepay
    });

    expect(receipt.transactionHash).not.toBe('');
  });

  it('should use pullCollateral succesfully', async () => {
    const allowance = 100000000;
    const collateralToPledge = 10;
    const previousCollateralQuotaBalance = await getBorrowerCollateralBalance({
      provider: ajna.provider,
      collateralAddress: config.QUOTE_ADDRESS,
      tokenAddress: config.BORROWER
    });

    await pool.quoteApprove({
      signer: signerBorrower,
      allowance
    });

    await pool.pullCollateral({
      signer: signerBorrower,
      collateralToPledge
    });

    expect(
      await getBorrowerCollateralBalance({
        provider: ajna.provider,
        collateralAddress: config.QUOTE_ADDRESS,
        tokenAddress: config.BORROWER
      })
    ).toBe(previousCollateralQuotaBalance + collateralToPledge);
  });

  it('should use removeQuoteToken succesfully', async () => {
    const allowance = 100000;
    const quoteAmount = 10;
    const bucketIndex = 2000;

    await pool.quoteApprove({
      signer: signerLender,
      allowance
    });

    await pool.addQuoteToken({
      signer: signerLender,
      amount: quoteAmount,
      bucketIndex
    });

    const receipt = await pool.removeQuoteToken({
      signer: signerLender,
      amount: quoteAmount,
      bucketIndex
    });

    expect(receipt.transactionHash).not.toBe('');
  });
});
