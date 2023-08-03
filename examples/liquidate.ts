#!/usr/bin/env ts-node

import { AjnaSDK } from '../src/classes/AjnaSDK';
import { Liquidation } from '../src/classes/Liquidation';
import { fromWad, toWad, wmul } from '../src/utils/numeric';
import { priceToIndex } from '../src/utils/pricing';
import { BigNumber, Signer, constants } from 'ethers';
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

async function run() {
  const { ajna, signer: signerLender } = await initAjna('lender');
  const pool = await getPool(ajna);
  console.log('Found pool at ', pool.poolAddress);
  const stats = await pool.getStats();
  console.log('Pool is', +fromWad(stats.collateralization) * 100 + '% collateralized');

  const action = process.argv.length > 2 ? process.argv[2] : '';

  if (action === 'kick') {
    if (process.argv.length <= 3) throw new Error('Please identify loan to kick');
    const borrowerAddress = process.argv[3];
    const tx = await pool.kick(signerLender, borrowerAddress);
    await tx.verifyAndSubmit();
    console.log('Kicked loan', borrowerAddress);
    return;
  }
  if (action === 'lenderKick') {
    if (process.argv.length <= 3)
      throw new Error('Please provide price of bucket in which you have liquidity to kick');
    const bucket = await pool.getBucketByIndex(priceToIndex(toWad(process.argv[3])));
    const tx = await bucket.lenderKick(signerLender);
    await tx.verifyAndSubmit();
    console.log('Kicked from bucket', bucket.index);
    return;
  }
  if (action === 'status') {
    if (process.argv.length <= 3) throw new Error('Please identify loan to check auction status');
    const liquidation = pool.getLiquidation(process.argv[3]);
    const auctionStatus = await liquidation.getStatus();
    console.log(
      `Auction price ${fromWad(auctionStatus.price)} with`,
      `${fromWad(auctionStatus.collateral)} collateral remaining and`,
      `${fromWad(auctionStatus.debtToCover)} debt to cover`
    );
    return;
  }
  if (action === 'take') {
    if (process.argv.length <= 3) throw new Error('Please identify liquidation to take');
    // take maximum amount of collateral if no amount specified
    const liquidation = pool.getLiquidation(process.argv[3]);
    const auctionStatus = await liquidation.getStatus();
    const collateral = process.argv.length > 4 ? toWad(process.argv[4]) : auctionStatus.collateral;
    take(pool, signerLender, liquidation, collateral);
    return;
  }
  if (action === 'settle') {
    if (process.argv.length <= 3) throw new Error('Please identify liquidation to settle');
    const liquidation = pool.getLiquidation(process.argv[3]);
    settleAndWithdrawBond(pool, signerLender, liquidation);
    return;
  }
}

run();
