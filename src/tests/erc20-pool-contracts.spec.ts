/* eslint-disable no-console */
import Web3 from 'web3';
import dotenv from 'dotenv';
import toWei from '../utils/to-wei';
import { TEST_CONFIG as config } from '../constants/config';
import { AjnaSDK } from '../classes/ajna';
import { Pool } from '../classes/pool';
import addAccount from '../utils/add-account';
import {
  getBorrowerQuoteBalance,
  getBorrowerCollateralBalance
} from '../contracts/get-generic-contract';

dotenv.config();

jest.setTimeout(120000);

describe('Ajna SDK Erc20 Pool tests', () => {
  const ajna = new AjnaSDK(new Web3(config.ETH_RPC_URL || ''));
  let pool: Pool = {} as Pool;

  beforeAll(async () => {
    try {
      // Creating a signing account from a private key LENDER
      addAccount(ajna.web3, config.LENDER_KEY);

      // Creating a signing account from a private key BORROWER
      addAccount(ajna.web3, config.BORROWER_KEY);
    } catch (err) {
      console.log(err);

      throw err;
    }
  });

  it('should confirm AjnaSDK pool succesfully', async () => {
    pool = await ajna.factory.deployPool({
      collateralAddress: config.COLLATERAL_ADDRESS,
      quoteAddress: config.QUOTE_ADDRESS,
      userAddress: config.LENDER,
      interestRate: '0.05'
    });

    expect(pool.poolAddress).not.toBe('');
  });

  it('should use pledgeCollateral succesfully', async () => {
    const allowance = 1000000000;
    const collateralToPledge = 100;

    await pool.collateralApprove({
      allowance,
      from: config.BORROWER
    });

    const receipt = await pool.pledgeCollateral({
      to: config.BORROWER,
      collateralToPledge,
      from: config.BORROWER
    });

    expect(receipt.transactionHash).not.toBe('');
  });

  it('should use addQuoteToken succesfully', async () => {
    const quoteAmount = 10;
    const bucketIndex = 2000;
    const allowance = 100000000;

    await pool.quoteApprove({
      allowance,
      from: config.LENDER
    });

    const receipt = await pool.addQuoteToken({
      amount: quoteAmount,
      bucketIndex,
      from: config.LENDER
    });

    expect(receipt.transactionHash).not.toBe('');
  });

  it('should use borrow quote tokens succesfully', async () => {
    const bucketIndex = 5000;
    const amountToBorrow = 10;
    const currentQuotaBalance = await getBorrowerQuoteBalance({
      web3: ajna.web3,
      quoteAddress: config.QUOTE_ADDRESS,
      tokenAddress: config.BORROWER
    });

    await pool.borrow({
      amount: amountToBorrow,
      bucketIndex,
      from: config.BORROWER
    });

    const updatedQuotaBalance = await getBorrowerQuoteBalance({
      web3: ajna.web3,
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
      allowance,
      from: config.BORROWER
    });

    const receipt = await pool.repay({
      amount: amountToRepay,
      from: config.BORROWER
    });

    expect(receipt.transactionHash).not.toBe('');
  });

  it('should use pullCollateral succesfully', async () => {
    const allowance = 100000000;
    const collateralToPledge = 10;
    const previousCollateralQuotaBalance = await getBorrowerCollateralBalance({
      web3: ajna.web3,
      collateralAddress: config.QUOTE_ADDRESS,
      tokenAddress: config.BORROWER
    });

    await pool.quoteApprove({
      allowance,
      from: config.BORROWER
    });

    await pool.pullCollateral({
      collateralToPledge,
      from: config.BORROWER
    });

    expect(
      await getBorrowerCollateralBalance({
        web3: ajna.web3,
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
      allowance,
      from: config.LENDER
    });

    await pool.addQuoteToken({
      amount: quoteAmount,
      bucketIndex,
      from: config.LENDER
    });

    const receipt = await pool.removeQuoteToken({
      amount: quoteAmount,
      bucketIndex,
      from: config.LENDER
    });

    expect(receipt.transactionHash).not.toBe('');
  });
});
