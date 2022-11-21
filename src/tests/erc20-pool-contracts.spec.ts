/* eslint-disable no-console */
import Web3 from 'web3';
import dotenv from 'dotenv';
// import { Contract } from 'web3-eth-contract';
import {
  deployPool,
  deployedPools
} from '../contracts/get-pool-factory-contract';
import {
  addQuoteToken,
  borrow,
  pledgeCollateral,
  pullCollateral,
  removeQuoteToken,
  repay
} from '../contracts/get-pool-contract';
import {
  collateralApprove,
  quoteApprove,
  getBorrowerQuoteBalance,
  getBorrowerCollateralBalance
} from '../contracts/get-generic-contract';
import toWei from '../utils/to-wei';
import addWeb3Account from '../utils/add-web3-account';
import config from '../constants/config';

dotenv.config();

jest.setTimeout(120000);

describe('Ajna SDK tests:', () => {
  let web3: Web3;
  let poolAddress: string;

  beforeAll(async () => {
    try {
      web3 = new Web3(config.ETH_RPC_URL || '');

      // Creating a signing account from a private key LENDER
      addWeb3Account(web3, config.LENDER_KEY);

      // Creating a signing account from a private key BORROWER
      addWeb3Account(web3, config.BORROWER_KEY);
    } catch (err) {
      console.log(err);

      // handle error
      throw err;
    }
  });

  it('should deploy a new pool', async () => {
    const interestRate = '0.05';

    await deployPool(
      web3,
      config.COLLATERAL_ADDRESS,
      config.QUOTE_ADDRESS,
      config.LENDER,
      interestRate
    );

    poolAddress = await deployedPools(
      web3,
      config.COLLATERAL_ADDRESS,
      config.QUOTE_ADDRESS
    );

    expect(poolAddress).not.toBe('');
  });

  describe('should USE the pool deployed', () => {
    it('should use pledgeCollateral succesfully', async () => {
      const allowance = '100000000';
      const collateralToPledge = '100';

      await collateralApprove({
        web3,
        poolAddress,
        allowance,
        collateralAddress: config.COLLATERAL_ADDRESS || '',
        from: config.BORROWER
      });

      const receipt = await pledgeCollateral({
        web3,
        poolAddress,
        to: config.BORROWER,
        collateralToPledge,
        from: config.BORROWER
      });

      // Lender pledged ${collateralToPledge} collateral in the pool
      expect(receipt.transactionHash).not.toBe('');
    });

    it('should use addQuoteToken succesfully', async () => {
      const quoteAmount = 10;
      const bucketIndex = 2000;
      const allowance = 100000000;

      await quoteApprove({
        web3,
        poolAddress,
        allowance,
        quoteAddress: config.QUOTE_ADDRESS,
        from: config.LENDER
      });

      const receipt = await addQuoteToken({
        web3,
        poolAddress,
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
        web3,
        quoteAddress: config.QUOTE_ADDRESS,
        tokenAddress: config.BORROWER
      });

      await borrow({
        web3,
        poolAddress,
        amount: amountToBorrow,
        bucketIndex,
        from: config.BORROWER
      });

      const updatedQuotaBalance = await getBorrowerQuoteBalance({
        web3,
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

      await quoteApprove({
        web3,
        poolAddress,
        allowance,
        quoteAddress: config.QUOTE_ADDRESS,
        from: config.BORROWER
      });

      // repay loan with debt
      const receipt = await repay({
        web3,
        poolAddress,
        amount: amountToRepay,
        from: config.BORROWER
      });

      expect(receipt.transactionHash).not.toBe('');
    });

    it('should use pullCollateral succesfully', async () => {
      const allowance = 100000000;
      const collateralToPledge = 10;
      const previousCollateralQuotaBalance = await getBorrowerCollateralBalance(
        {
          web3,
          collateralAddress: config.QUOTE_ADDRESS,
          tokenAddress: config.BORROWER
        }
      );

      await quoteApprove({
        web3,
        poolAddress,
        allowance,
        quoteAddress: config.QUOTE_ADDRESS,
        from: config.BORROWER
      });

      // repay loan with debt
      await pullCollateral({
        web3,
        poolAddress,
        collateralToPledge,
        from: config.BORROWER
      });

      expect(
        await getBorrowerCollateralBalance({
          web3,
          collateralAddress: config.QUOTE_ADDRESS,
          tokenAddress: config.BORROWER
        })
      ).toBe(previousCollateralQuotaBalance + collateralToPledge);
    });

    it('should use removeQuoteToken succesfully', async () => {
      const allowance = 100000;
      const quoteAmount = 10;
      const bucketIndex = 2000;

      // First approve
      await quoteApprove({
        web3,
        poolAddress,
        allowance,
        quoteAddress: config.QUOTE_ADDRESS,
        from: config.LENDER
      });

      // add quote token
      await addQuoteToken({
        web3,
        poolAddress,
        amount: quoteAmount,
        bucketIndex,
        from: config.LENDER
      });

      // remove quote token
      const receipt = await removeQuoteToken({
        web3,
        poolAddress,
        amount: quoteAmount,
        bucketIndex,
        from: config.LENDER
      });

      expect(receipt.transactionHash).not.toBe('');
    });
  });
});
