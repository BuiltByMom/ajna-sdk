/* eslint-disable @typescript-eslint/no-explicit-any, no-console */
import Web3 from 'web3';
import { Contract } from 'web3-eth-contract';
import { getPoolFactoryContract } from './contracts/get-pool-factory-contract';
import { getPoolContract } from './contracts/get-pool-contract';
import { getGenericContract } from './contracts/get-generic-contract';
import dotenv from 'dotenv';

dotenv.config();

const config = {
  ETH_RPC_URL: process.env.AJNA_ETH_RPC_URL,
  COLLATERAL_ADDRESS: process.env.AJNA_COLLATERAL_ADDRESS,
  QUOTE_ADDRESS: process.env.AJNA_QUOTE_ADDRESS,
  LENDER: process.env.AJNA_LENDER_ADDRESS,
  LENDER_KEY: process.env.AJNA_LENDER_PRIVATE_KEY,
  BORROWER: process.env.AJNA_BORROWER_ADDRESS,
  BORROWER_KEY: process.env.AJNA_BORROWER_PRIVATE_KEY
};

jest.setTimeout(60000);

describe('Ajna SDK tests:', () => {
  // let accounts: string[];
  let web3: any;
  let signerLender: any;
  let signerBorrower: any;
  let poolAddress: string;
  let contractQuote: Contract;
  let contractCollateral: Contract;

  // const getBorrowerCollateralBalance = async () => {
  //   return await contractCollateral.methods.balanceOf(config.BORROWER).call();
  // };

  const getBorrowerQuoteBalance = async () => {
    return await contractQuote.methods.balanceOf(config.BORROWER).call();
  };

  beforeAll(async () => {
    try {
      web3 = new Web3(config['ETH_RPC_URL'] || '');

      // Creating a signing account from a private key LENDER
      signerLender = web3.eth.accounts.privateKeyToAccount(config.LENDER_KEY);
      web3.eth.accounts.wallet.add(signerLender);

      // Creating a signing account from a private key BORROWER
      signerBorrower = web3.eth.accounts.privateKeyToAccount(
        config.BORROWER_KEY
      );
      web3.eth.accounts.wallet.add(signerBorrower);

      // accounts = await web3.eth.getAccounts();
      // console.log(accounts);
    } catch (err) {
      console.log(err);

      // handle error
      throw err;
    }
  });

  it('should deploy a new pool', async () => {
    // Create initial contract instance
    const contractInstance: Contract = getPoolFactoryContract(web3);

    const interestRate = web3.utils.toWei('0.05', 'ether');
    const nonSubsetHashParam = web3.utils
      .keccak256('ERC20_NON_SUBSET_HASH')
      .toString();

    const tx = contractInstance.methods.deployPool(
      config.COLLATERAL_ADDRESS,
      config.QUOTE_ADDRESS,
      interestRate
    );

    await tx.send({
      from: signerLender.address,
      gas: await tx.estimateGas()
    });
    // .once('transactionHash', () => {
    //   console.log(`Mining transaction ...`);
    // });

    poolAddress = await contractInstance.methods
      .deployedPools(
        nonSubsetHashParam,
        config.COLLATERAL_ADDRESS,
        config.QUOTE_ADDRESS
      )
      .call();

    // console.info('poolAddress', poolAddress);

    expect(poolAddress).not.toBe('');
  });

  describe('should USE the pool deployed', () => {
    it('should use pledgeCollateral succesfully', async () => {
      const allowance = web3.utils.toWei(String(100000000), 'ether');
      contractCollateral = getGenericContract(
        web3,
        config.COLLATERAL_ADDRESS || ''
      );
      const contractPool: Contract = getPoolContract(web3, poolAddress);

      // First approve
      await contractCollateral.methods.approve(poolAddress, allowance).send({
        from: config.BORROWER,
        gas: 2000000
      });
      // .once('transactionHash', () => {
      //   console.log(`Mining approve transaction ...`);
      // });

      const collateralToPledge = web3.utils.toWei(String(100), 'ether');

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
      const quoteAmount = web3.utils.toWei(String(100), 'ether');
      const bucketIndex = 2000; // index 2000 = price
      const allowance = web3.utils.toWei(String(100000000), 'ether');
      contractQuote = getGenericContract(web3, config.QUOTE_ADDRESS || '');
      const contractPool: Contract = getPoolContract(web3, poolAddress);

      // First approve
      await contractQuote.methods.approve(poolAddress, allowance).send({
        from: config.LENDER,
        gas: 2000000
      });

      await contractPool.methods.addQuoteToken(quoteAmount, bucketIndex).send({
        from: config.LENDER,
        gas: 2000000
      });
      // .once('transactionHash', () => {
      //   console.log(`Lender added ${quoteAmount} quote token to the pool`);
      // });

      const updatedQuotaBalance = await getBorrowerQuoteBalance();

      expect(updatedQuotaBalance).toBe(quoteAmount);
    });

    it('should use borrow quote tokens succesfully', async () => {
      const amountToBorrow = web3.utils.toWei(String(100), 'ether');
      const contractPool: Contract = getPoolContract(web3, poolAddress);
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
  });
});
