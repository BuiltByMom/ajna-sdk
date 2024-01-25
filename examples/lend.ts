#!/usr/bin/env ts-node

import { FungiblePool } from '../src/classes/FungiblePool';
import { Address, SdkError } from '../src/types';
import { fromWad, toWad } from '../src/utils/numeric';
import { indexToPrice, priceToIndex } from '../src/utils/pricing';
import { BigNumber, Signer } from 'ethers';
import dotenv from 'dotenv';
import { MAX_FENWICK_INDEX } from '../src/constants';
import { initAjna } from './utils';
import { AjnaSDK } from '../src/classes/AjnaSDK';
import { LPToken } from '../src/classes/LPToken';

dotenv.config();

const collateralAddress = process.env.COLLATERAL_TOKEN || '0x0';
const quoteAddress = process.env.QUOTE_TOKEN || '0x0';
let pool: FungiblePool;
let signerLender: Signer;

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
async function addLiquidity(amount: BigNumber, price: BigNumber) {
  // validate the user's price
  if (price.gt(indexToPrice(1)) || price.lte(indexToPrice(MAX_FENWICK_INDEX)))
    throw new SdkError('Please provide a valid price');

  const bucket = await pool.getBucketByPrice(price);

  let tx = await pool.quoteApproveHelper(signerLender, amount);
  await tx.verifyAndSubmit();

  tx = await pool.approveLenderHelperLPTransferor(signerLender);
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

// Adds collateral to a bucket, to arb out overpriced liquidity
async function addCollateral(amount: BigNumber, price: BigNumber) {
  const bucketIndex = priceToIndex(price);
  let tx = await pool.collateralApprove(signerLender, amount);
  await tx.verifyAndSubmit();
  tx = await pool.addCollateral(signerLender, bucketIndex, amount);
  await tx.verifyAndSubmit();
  console.log('Added collateral to bucket', bucketIndex);
}

async function removeCollateral(amount: BigNumber, price: BigNumber) {
  const bucketIndex = priceToIndex(price);
  const tx = await pool.removeCollateral(signerLender, bucketIndex, amount);
  await tx.verifyAndSubmit();
  console.log('Removed collateral from bucket', bucketIndex);
}

async function mint() {
  const tx = await pool.mintLPToken(signerLender);
  const receipt = await tx.verifyAndSubmit();
  const mintEventLogs = tx.getEventLogs(receipt).get('Mint')![0];
  const tokenId = mintEventLogs.args['tokenId'];
  console.log('Minted tokenId', tokenId.toString());
}

async function memorialize(tokenId: BigNumber, bucketIndex: number) {
  const token = LPToken.fromTokenId(signerLender, tokenId);
  const bucket = await pool.getBucketByIndex(bucketIndex);
  const position = await bucket.getPosition(await signerLender.getAddress());
  console.log('Increasing LP allowance to', fromWad(position.lpBalance), 'for bucket', bucketIndex);
  let tx = await pool.increaseLPAllowance(signerLender, [bucketIndex], [position.lpBalance]);
  await tx.verifyAndSubmit();
  tx = await pool.approvePositionManagerLPTransferor(signerLender);
  await tx.verifyAndSubmit();
  tx = await token.memorializePositions(signerLender, pool.contract, [bucketIndex]);
  await tx.verifyAndSubmit();
  console.log('Memorialized position in bucket', bucketIndex);
}

async function redeem(tokenId: BigNumber, bucketIndex: number) {
  const token = LPToken.fromTokenId(signerLender, tokenId);
  const tx = await token.redeemPositions(signerLender, pool.contract, [bucketIndex]);
  await tx.verifyAndSubmit();
  console.log('Redeemed position in bucket', bucketIndex, 'from tokenId', tokenId.toString());
}

async function burn(tokenId: BigNumber) {
  const tx = await pool.burnLPToken(signerLender, tokenId);
  await tx.verifyAndSubmit();
  console.log('Burned tokenId', tokenId.toString());
}

async function withdrawAll(indices: Array<number>) {
  const tx = await pool.withdrawLiquidity(signerLender, indices);
  await tx.verifyAndSubmit();
  console.log('Withdrew liquidity from buckets', indices);
}

async function updateInterest() {
  await pool.updateInterest(signerLender);
  const stats = await pool.getStats();
  console.log('Borrow rate ', fromWad(stats.borrowRate), 'after updating');
}

async function run() {
  const { ajna, signer } = await initAjna('lender');
  signerLender = signer;
  pool = await getPool(ajna, signerLender);

  const stats = await pool.getStats();
  const prices = await pool.getPrices();
  console.log('Pool has', fromWad(stats.poolSize), 'liquidity and', fromWad(stats.debt), 'debt');
  console.log('Borrow rate', fromWad(stats.borrowRate));

  const poolPriceIndex = Math.max(prices.lupIndex, prices.hpbIndex);
  const poolPriceExists = poolPriceIndex > 0 && poolPriceIndex < MAX_FENWICK_INDEX;
  if (poolPriceExists) console.log('Pool price', fromWad(indexToPrice(poolPriceIndex)));

  const action = process.argv.length > 2 ? process.argv[2] : '';
  let amount = toWad(0);
  let price = toWad(0);
  let tokenId = BigNumber.from(0);
  if (action.includes('add') || action.includes('remove')) {
    amount = process.argv.length > 3 ? toWad(process.argv[3]) : toWad('100');
    price = process.argv.length > 4 ? toWad(process.argv[4]) : indexToPrice(poolPriceIndex);
  } else if (action === 'burn' || action === 'memorialize' || action === 'redeem') {
    tokenId = BigNumber.from(process.argv[3]);
  }

  switch (action) {
    case 'add': {
      await addLiquidity(amount, price);
      return;
    }
    case 'remove': {
      await removeLiquidity(amount, price);
      return;
    }

    case 'addCollateral': {
      await addCollateral(amount, price);
      return;
    }
    case 'removeCollateral': {
      await removeCollateral(amount, price);
      return;
    }

    case 'mint': {
      await mint();
      return;
    }

    case 'memorialize': {
      const bucketIndex = +process.argv[4];
      await memorialize(tokenId, bucketIndex);
      return;
    }

    case 'redeem': {
      const bucketIndex = +process.argv[4];
      await redeem(tokenId, bucketIndex);
      return;
    }

    case 'burn': {
      await burn(BigNumber.from(tokenId));
      return;
    }

    case 'withdrawAll': {
      const indices = process.argv[3].split(',').map(val => +val);
      await withdrawAll(indices);
      return;
    }

    case 'updateInterest': {
      await updateInterest();
      return;
    }
  }
}

run();
