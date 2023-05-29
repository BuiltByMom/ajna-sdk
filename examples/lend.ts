#!/usr/bin/env ts-node

import { AjnaSDK } from '../src/classes/AjnaSDK';
import { Config } from '../src/classes/Config';
import { FungiblePool } from '../src/classes/FungiblePool';
import { Address } from '../src/types';
import { addAccountFromKeystore } from '../src/utils/add-account';
import { fromWad, toWad } from '../src/utils/numeric';
import { priceToIndex } from '../src/utils/pricing';
import { BigNumber, constants, providers } from 'ethers';

// Configure from environment
const provider = new providers.JsonRpcProvider(process.env.ETH_RPC_URL);
// Use this for local testnets, where JSON keystores are unavailable.
// const signerLender = addAccountFromKey(process.env.ETH_KEY || '', provider);
// Use this for a real chain, such as Goerli or Mainnet.
const signerLender = addAccountFromKeystore(process.env.LENDER_KEYSTORE || '', provider);

Config.fromEnvironment();
const ajna = new AjnaSDK(provider);
const collateralAddress = process.env.COLLATERAL_TOKEN || '0x0';
const quoteAddress = process.env.QUOTE_TOKEN || '0x0';
let pool: FungiblePool;

// Looks for pool, deploying it if it doesn't already exist
async function getPool() {
  pool = await ajna.factory.getPool(collateralAddress, quoteAddress);
  if (pool.poolAddress === constants.AddressZero) {
    pool = await deployPool(collateralAddress, quoteAddress);
    console.log('Deployed pool to ', pool.poolAddress);
  } else {
    console.log('Using pool with address ', pool.poolAddress);
  }
  return pool;
}

async function deployPool(collateral: Address, quote: Address) {
  const tx = await ajna.factory.deployPool(signerLender, collateral, quote, toWad('0.05'));
  await tx.verifyAndSubmit();
  return await ajna.factory.getPool(collateralAddress, quoteAddress);
}

// Using fine-grained approval, add liquidity to the pool
async function addLiquidity(amount: BigNumber, price: BigNumber) {
  const bucket = await pool.getBucketByPrice(price);
  let tx = await pool.quoteApprove(signerLender, amount);
  await tx.verifyAndSubmit();
  tx = await bucket.addQuoteToken(signerLender, amount);
  await tx.verifyAndSubmit();
  console.log('Added', fromWad(amount), 'liquidity to bucket', bucket.index);
}

async function removeLiquidity(amount: BigNumber, price: BigNumber) {
  const bucket = await pool.getBucketByPrice(price);
  const tx = await bucket.removeQuoteToken(signerLender, amount);
  await tx.verifyAndSubmit();
  console.log('Removed liquidity from bucket', bucket.index);
}

async function run() {
  const pool = await getPool();
  const stats = await pool.getStats();
  console.log('Pool has', fromWad(stats.poolSize), 'liquidity and', stats.loansCount, 'loans');

  const action = process.argv.length > 2 ? process.argv[2] : '';
  const deposit = process.argv.length > 3 ? toWad(process.argv[3]) : toWad('200');
  const price = process.argv.length > 4 ? toWad(process.argv[4]) : toWad('2007.0213');

  if (action === 'add') {
    await addLiquidity(deposit, price);
    return;
  }
  if (action === 'remove') {
    await removeLiquidity(deposit, price);
    return;
  }
}

run();
