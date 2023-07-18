#!/usr/bin/env ts-node

import { FungiblePool } from '../src/classes/FungiblePool';
import { Address, SdkError } from '../src/types';
import { fromWad, toWad } from '../src/utils/numeric';
import { indexToPrice } from '../src/utils/pricing';
import { BigNumber, Signer } from 'ethers';
import dotenv from 'dotenv';
import { MAX_FENWICK_INDEX } from '../src/constants';
import { initAjna } from './utils';
import { AjnaSDK } from '../src/classes/AjnaSDK';

dotenv.config();

const collateralAddress = process.env.COLLATERAL_TOKEN || '0x0';
const quoteAddress = process.env.QUOTE_TOKEN || '0x0';

// Looks for pool, deploying it if it doesn't already exist
async function getPool(ajna: AjnaSDK, signerLender: Signer) {
  let pool: FungiblePool;
  try {
    pool = await ajna.fungiblePoolFactory.getPool(collateralAddress, quoteAddress);
    console.log('Using pool with address', pool.poolAddress);
  } catch (error) {
    pool = await deployPool(ajna, signerLender, collateralAddress, quoteAddress);
    console.log('Deployed pool to', pool.poolAddress);
  }
  return pool;
}

async function deployPool(
  ajna: AjnaSDK,
  signerLender: Signer,
  collateral: Address,
  quote: Address
) {
  const tx = await ajna.fungiblePoolFactory.deployPool(
    signerLender,
    collateral,
    quote,
    toWad('0.05')
  );
  await tx.verifyAndSubmit();
  return await ajna.fungiblePoolFactory.getPool(collateralAddress, quoteAddress);
}

// Using fine-grained approval, add liquidity to the pool
async function addLiquidity(
  pool: FungiblePool,
  signerLender: Signer,
  amount: BigNumber,
  price: BigNumber
) {
  // validate the user's price
  if (price.gt(indexToPrice(1)) || price.lte(indexToPrice(MAX_FENWICK_INDEX)))
    throw new SdkError('Please provide a valid price');

  const bucket = await pool.getBucketByPrice(price);
  let tx = await pool.quoteApprove(signerLender, amount);
  await tx.verifyAndSubmit();
  tx = await bucket.addQuoteToken(signerLender, amount);
  await tx.verifyAndSubmit();
  console.log('Added', fromWad(amount), 'liquidity to bucket', bucket.index);
}

async function removeLiquidity(
  pool: FungiblePool,
  signerLender: Signer,
  amount: BigNumber,
  price: BigNumber
) {
  const bucket = await pool.getBucketByPrice(price);
  const tx = await bucket.removeQuoteToken(signerLender, amount);
  await tx.verifyAndSubmit();
  console.log('Removed liquidity from bucket', bucket.index);
}

async function updateInterest(pool: FungiblePool, signerLender: Signer) {
  await pool.updateInterest(signerLender);
  const stats = await pool.getStats();
  console.log('Borrow rate ', fromWad(stats.borrowRate), 'after updating');
}

async function run() {
  const { ajna, signer: signerLender } = await initAjna('lender');
  const pool = await getPool(ajna, signerLender);

  const stats = await pool.getStats();
  const prices = await pool.getPrices();
  console.log('Pool has', fromWad(stats.poolSize), 'liquidity and', fromWad(stats.debt), 'debt');
  console.log('Borrow rate', fromWad(stats.borrowRate));

  const poolPriceIndex = Math.max(prices.lupIndex, prices.hpbIndex);
  const poolPriceExists = poolPriceIndex > 0 && poolPriceIndex < MAX_FENWICK_INDEX;
  if (poolPriceExists) console.log('Pool price', fromWad(indexToPrice(poolPriceIndex)));

  const action = process.argv.length > 2 ? process.argv[2] : '';
  const deposit = process.argv.length > 3 ? toWad(process.argv[3]) : toWad('100');
  const price = process.argv.length > 4 ? toWad(process.argv[4]) : indexToPrice(poolPriceIndex);

  if (action === 'add') {
    await addLiquidity(pool, signerLender, deposit, price);
    return;
  }
  if (action === 'remove') {
    await removeLiquidity(pool, signerLender, deposit, price);
    return;
  }
  if (action === 'updateInterest') {
    await updateInterest(pool, signerLender);
    return;
  }
}

run();
