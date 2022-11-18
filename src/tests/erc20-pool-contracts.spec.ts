/* eslint-disable no-console */
import Web3 from 'web3';
import dotenv from 'dotenv';
import { Contract } from 'web3-eth-contract';
import {
  deployPool,
  deployedPools
} from '../contracts/get-pool-factory-contract';
import { getPoolContract } from '../contracts/get-pool-contract';
import { getGenericContract } from '../contracts/get-generic-contract';
import toWei from '../utils/to-wei';
import addWeb3Account from '../utils/add-web3-account';
import config from '../constants/config';

dotenv.config();

jest.setTimeout(120000);

describe('Ajna SDK tests:', () => {
  let web3: Web3;
  let poolAddress: string;
  let contractQuote: Contract;
  let contractCollateral: Contract;
  let contractPool: Contract;

  const getBorrowerCollateralBalance = async () => {
    return await contractCollateral.methods.balanceOf(config.BORROWER).call();
  };

  const getBorrowerQuoteBalance = async () => {
    return await contractQuote.methods.balanceOf(config.BORROWER).call();
  };

  // TODO
  // const getQuoteBalance = async () => {
  //   return await contractQuote.methods.balanceOf(config.LENDER).call();
  // };

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
      const allowance = toWei('100000000');
      contractCollateral = getGenericContract(
        web3,
        config.COLLATERAL_ADDRESS || ''
      );
      contractPool = getPoolContract(web3, poolAddress);

      // First approve
      await contractCollateral.methods.approve(poolAddress, allowance).send({
        from: config.BORROWER,
        gas: 2000000
      });
      // .once('transactionHash', () => {
      //   console.log(`Mining approve transaction ...`);
      // });

      const collateralToPledge = toWei(100);

      const receipt = await contractPool.methods
        .pledgeCollateral(config.BORROWER, collateralToPledge)
        .send({
          from: config.BORROWER,
          gas: 2000000
        });
      // .once('transactionHash', () => {
      //   console.log(
      //     `Lender pledged ${collateralToPledge} collateral in the pool`
      //   );
      // });

      expect(receipt.transactionHash).not.toBe('');
    });

    it('should use addQuoteToken succesfully', async () => {
      const quoteAmount = toWei(10);
      const bucketIndex = 2000; // index 2000 = price
      const allowance = toWei(100000000);
      contractQuote = getGenericContract(web3, config.QUOTE_ADDRESS || '');

      // First approve
      await contractQuote.methods.approve(poolAddress, allowance).send({
        from: config.LENDER,
        gas: 2000000
      });

      const receipt = await contractPool.methods
        .addQuoteToken(quoteAmount, bucketIndex)
        .send({
          from: config.LENDER,
          gas: 2000000
        });
      // .once('transactionHash', () => {
      //   console.log(`Lender added ${quoteAmount} quote token to the pool`);
      // });

      // const updatedQuotaBalance = await getBorrowerQuoteBalance();

      // expect(updatedQuotaBalance).toBe(quoteAmount);

      expect(receipt.transactionHash).not.toBe('');
    });

    it('should use borrow quote tokens succesfully', async () => {
      const amountToBorrow = toWei(10);
      const currentQuotaBalance = await getBorrowerQuoteBalance();

      await contractPool.methods.borrow(amountToBorrow, 5000).send({
        from: config.BORROWER,
        gas: 2000000
      });
      // .once('transactionHash', () => {
      //   console.log(
      //     `Borrower borrowed ${amountToBorrow} quote tokens from the pool`
      //   );
      // });

      const updatedQuotaBalance = await getBorrowerQuoteBalance();

      expect(Number(updatedQuotaBalance)).toBe(
        Number(currentQuotaBalance) + Number(amountToBorrow)
      );
    });

    it('should use repay loan with debt succesfully', async () => {
      const allowance = toWei(100000000);
      const amountToRepay = toWei(10);

      await contractQuote.methods.approve(poolAddress, allowance).send({
        from: config.BORROWER,
        gas: 200000
      });

      // repay loan with debt
      const receipt = await contractPool.methods
        .repay(config.BORROWER, amountToRepay)
        .send({
          from: config.BORROWER,
          gas: 2000000
        });

      expect(receipt.transactionHash).not.toBe('');
    });

    it('should use pullCollateral succesfully', async () => {
      const allowance = toWei(100000000);
      const collateralToPledge = toWei(10);
      const previousCollateralQuotaBalance =
        await getBorrowerCollateralBalance();

      await contractQuote.methods.approve(poolAddress, allowance).send({
        from: config.BORROWER,
        gas: 200000
      });

      // repay loan with debt
      await contractPool.methods.pullCollateral(collateralToPledge).send({
        from: config.BORROWER,
        gas: 2000000
      });

      // console.log(await getBorrowerQuoteBalance());
      // console.log(await getQuoteBalance());
      // console.log(await getBorrowerCollateralBalance());

      expect(Number(await getBorrowerCollateralBalance())).toBe(
        Number(previousCollateralQuotaBalance) + Number(collateralToPledge)
      );
    });

    it('should use removeQuoteToken succesfully', async () => {
      const allowance = toWei(100000);
      const quoteAmount = toWei(10);
      const bucketIndex = 2000;

      // First approve
      await contractQuote.methods.approve(poolAddress, allowance).send({
        from: config.LENDER,
        gas: 2000000
      });

      // add quote token
      await contractPool.methods.addQuoteToken(quoteAmount, bucketIndex).send({
        from: config.LENDER,
        gas: 2000000
      });

      // remove quote token
      const receipt = await contractPool.methods
        .removeQuoteToken(quoteAmount, bucketIndex)
        .send({
          from: config.LENDER,
          gas: 2000000
        });

      expect(receipt.transactionHash).not.toBe('');
    });
  });
});
