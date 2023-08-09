#!/usr/bin/env ts-node

import { AjnaSDK } from '../src/classes/AjnaSDK';
import { Liquidation } from '../src/classes/Liquidation';
import { fromWad, toWad, wmul } from '../src/utils/numeric';
import { priceToIndex } from '../src/utils/pricing';
import { BigNumber, Signer, constants, utils } from 'ethers';
import dotenv from 'dotenv';
import { initAjna } from './utils';
import { FungiblePool } from '../src/classes/FungiblePool';

dotenv.config();

const collateralAddress = process.env.COLLATERAL_TOKEN || '0x0';
const quoteAddress = process.env.QUOTE_TOKEN || '0x0';

// Gets instance of Pool object
async function getPool(ajna: AjnaSDK) {
  const pool = await ajna.fungiblePoolFactory.getPool(collateralAddress, quoteAddress);
  if (pool.poolAddress === constants.AddressZero) {
    throw new Error('Pool not yet deployed; run lender script first');
  }
  return pool;
}

async function take(
  pool: FungiblePool,
  signerLender: Signer,
  liquidation: Liquidation,
  collateral: BigNumber
) {
  const auctionStatus = await liquidation.getStatus();
  let tx = await pool.quoteApprove(signerLender, wmul(collateral, auctionStatus.price));
  await tx.verifyAndSubmit();
  tx = await liquidation.take(signerLender, collateral);
  await tx.verifyAndSubmit();
  console.log('Took auction', liquidation.borrowerAddress, 'at', fromWad(auctionStatus.price));
}

async function settleAndWithdrawBond(
  pool: FungiblePool,
  signerLender: Signer,
  liquidation: Liquidation
) {
  let tx = await liquidation.settle(signerLender);
  await tx.verifyAndSubmit();
  console.log('Settled auction', liquidation.borrowerAddress);
  tx = await pool.withdrawBonds(signerLender);
  await tx.verifyAndSubmit();
  console.log('Withdrew liquidation bond');
}

type Action = 'kick' | 'lenderKick' | 'status' | 'take' | 'settle' | 'arbTake' | 'bucketTake';

async function run() {
  const { ajna, signer: signerLender } = await initAjna('lender');
  const pool = await getPool(ajna);
  console.log('Found pool at ', pool.poolAddress);
  const stats = await pool.getStats();
  console.log('Pool is', +fromWad(stats.collateralization) * 100 + '% collateralized');

  const [, , action, borrowerAddress, collateralAmount] = process.argv;

  switch (action as Action) {
    case 'kick': {
      if (!borrowerAddress) throw new Error('Please identify loan to kick');
      const tx = await pool.kick(signerLender, borrowerAddress);
      await tx.verifyAndSubmit();
      console.log('Kicked loan', borrowerAddress);
      return;
    }

    case 'lenderKick': {
      if (process.argv.length <= 3)
        throw new Error('Please provide price of bucket in which you have liquidity to kick');
      const bucketPrice = process.argv[3];
      const bucket = await pool.getBucketByIndex(priceToIndex(toWad(bucketPrice)));
      const tx = await bucket.lenderKick(signerLender);
      await tx.verifyAndSubmit();
      console.log('Kicked from bucket', bucket.index);
      return;
    }

    case 'status': {
      if (!borrowerAddress) throw new Error('Please identify loan to check auction status');
      const liquidation = pool.getLiquidation(borrowerAddress);
      const auctionStatus = await liquidation.getStatus();
      console.log(
        `Auction price ${fromWad(auctionStatus.price)} with`,
        `${fromWad(auctionStatus.collateral)} collateral remaining and`,
        `${fromWad(auctionStatus.debtToCover)} debt to cover`
      );
      return;
    }

    case 'take': {
      if (!borrowerAddress) throw new Error('Please identify liquidation to take');
      // take maximum amount of collateral if no amount specified
      const liquidation = pool.getLiquidation(borrowerAddress);
      const auctionStatus = await liquidation.getStatus();
      const collateral =
        process.argv.length > 4 ? toWad(collateralAmount) : auctionStatus.collateral;
      take(pool, signerLender, liquidation, collateral);
      return;
    }

    case 'settle': {
      if (!borrowerAddress) throw new Error('Please identify liquidation to settle');
      const liquidation = pool.getLiquidation(borrowerAddress);
      await settleAndWithdrawBond(pool, signerLender, liquidation);
      return;
    }

    case 'arbTake': {
      if (!borrowerAddress) throw new Error('Please identify liquidation to arbTake');
      const liquidation = pool.getLiquidation(borrowerAddress);
      const status = await liquidation.getStatus();
      const bucket = await pool.getBucketByPrice(toWad(status.price));
      const tx = await liquidation.arbTake(signerLender, bucket.index);
      const receipt = await tx.verifyAndSubmit();
      console.log(`successfully ran arbTake on bucket index ${bucket.index}:`, receipt);
      return;
    }

    case 'bucketTake': {
      if (!borrowerAddress) throw new Error('Please identify liquidation to bucketTake');
      const liquidation = pool.getLiquidation(borrowerAddress);
      const status = await liquidation.getStatus();
      const bucket = await pool.getBucketByPrice(toWad(status.price));
      const tx = await liquidation.depositTake(signerLender, bucket.index);
      const receipt = await tx.verifyAndSubmit();
      console.log(`successfully ran bucketTake on bucket index ${bucket.index}:`, receipt);
      return;
    }

    default: {
      if (process.argv.length === 3) {
        const borrowerAddress = process.argv[2];
        if (!utils.isAddress(borrowerAddress)) {
          throw new Error('Invalid borrower address');
        }
        const liquidation = pool.getLiquidation(borrowerAddress);
        const auctionStatus = await liquidation.getStatus();
        const {
          price,
          collateral,
          debtToCover,
          kickTime,
          neutralPrice,
          isTakeable,
          isSettleable,
          isCollateralized,
        } = auctionStatus;
        console.log(
          `Auction price ${fromWad(price)} with`,
          `${fromWad(collateral)} collateral remaining and`,
          `${fromWad(debtToCover)} debt to cover.\n`,
          `kick time: ${kickTime.getTime()}\n`,
          `neutral price: ${fromWad(neutralPrice)}\n`,
          `takeable: ${isTakeable}\n`,
          `settleable: ${isSettleable}\n`,
          `collateralized: ${isCollateralized}`
        );
      } else {
        console.log('Please specify an action to take or a borrower address to check');
        console.log(
          'Available actions: kick, lenderKick, status, take, settle, arbTake, bucketTake'
        );
      }
      return;
    }
  }
}

run();
