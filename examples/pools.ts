#!/usr/bin/env ts-node

import { toWad } from '../src/utils/numeric';
import { BigNumber, Signer } from 'ethers';
import dotenv from 'dotenv';
import { initAjna, parseNodeError, formatBNsInObjectFromWad } from './utils';
import { AjnaSDK } from '../src/classes/AjnaSDK';
import { input } from '@inquirer/prompts';
import { Address } from '../src/types';
import { FungiblePool } from '../src/classes/FungiblePool';
import { Pool } from '../src/classes/Pool';
import { NonfungiblePool } from '../src/classes/NonfungiblePool';

dotenv.config();

const collateralAddress = process.env.COLLATERAL_TOKEN || '0x0';
const quoteAddress = process.env.QUOTE_TOKEN || '0x0';
const nftAddress = process.env.NFT_TOKEN || '0x0';

async function getPoolDetails(pool: Pool) {
  const stats = await pool.getStats();
  const prices = await pool.getPrices();
  return {
    stats: formatBNsInObjectFromWad(stats),
    prices: formatBNsInObjectFromWad(prices),
  };
}

async function deployFungiblePool(
  ajna: AjnaSDK,
  signerLender: Signer,
  collateral: Address,
  quote: Address,
  interestRate: BigNumber = BigNumber.from('0.05')
) {
  console.log(
    `Deploying fungible pool with\nCollateral token address: ${collateralAddress}\nQuote token address: ${quoteAddress}`
  );
  const tx = await ajna.fungiblePoolFactory.deployPool(
    signerLender,
    collateral,
    quote,
    interestRate
  );
  await tx.verifyAndSubmit();
  return await ajna.fungiblePoolFactory.getPool(collateralAddress, quoteAddress);
}

async function printPoolDetails(pool: Pool) {
  const { prices, stats } = await getPoolDetails(pool);
  console.log(`Prices:`, prices);
  console.log(`Stats:`, stats);
}

// Looks for pool, deploying it if it doesn't already exist
async function handleFungible(ajna: AjnaSDK, signer: Signer) {
  let pool: FungiblePool;
  try {
    pool = await ajna.fungiblePoolFactory.getPool(collateralAddress, quoteAddress);
    await printPoolDetails(pool);
    console.log('Fungible Pool already exists:', pool.poolAddress);
  } catch (error) {
    const interest = await input({ message: 'Enter Interest rate (default: 0.05)' });
    const interestRate = toWad(interest || '0.05');
    pool = await deployFungiblePool(ajna, signer, collateralAddress, quoteAddress, interestRate);
    await printPoolDetails(pool);
    console.log('Deployed Fungible pool to:', pool.poolAddress);
  }
  return pool;
}

async function handleCollectionPool(ajna: AjnaSDK, signer: Signer, interestRate: BigNumber) {
  let pool: NonfungiblePool;
  try {
    pool = await ajna.nonfungiblePoolFactory.getPool(collateralAddress, [], quoteAddress);
    await printPoolDetails(pool);
    console.log(`Nonfungible Collection Pool already exists: ${pool.poolAddress}`);
  } catch (error: any) {
    pool = await ajna.nonfungiblePoolFactory.getPool(collateralAddress, [], quoteAddress);
    if (pool) {
      const parsed = parseNodeError(pool.contract.interface, error);
      console.log(`parsed:`, parsed);
      return;
    }

    const tx = await ajna.nonfungiblePoolFactory.deployCollectionPool(
      signer,
      nftAddress || collateralAddress,
      quoteAddress,
      interestRate
    );
    const txn = (tx as any)._transaction;
    console.log(
      `Deploying Collection Pool from: ${txn.from}\nNFT address: ${
        nftAddress || collateralAddress
      }\nQuote token address: ${quoteAddress}`
    );

    await tx.verifyAndSubmit();

    const addr = await ajna.nonfungiblePoolFactory.getPoolAddress(
      collateralAddress,
      [],
      quoteAddress
    );
    console.log('Collection Pool deployed to:', addr);
  }
}

function formatTokenIds(tokenIds: Array<string>) {
  return tokenIds.map(val => BigNumber.from(val).toNumber());
}

async function handleSubsetPool(ajna: AjnaSDK, signer: Signer, interestRate: BigNumber) {
  let pool: NonfungiblePool;
  let tokenIdsInput = await input({
    message: 'Enter subset token IDs separated by comma (<number,number>): 1,2,3',
  });
  const splitted = tokenIdsInput.split(',');
  const subset = formatTokenIds(splitted);
  try {
    pool = await ajna.nonfungiblePoolFactory.getPool(collateralAddress, subset, quoteAddress);
    await printPoolDetails(pool);
    console.log(`Nunfungible Subset Pool already exists: ${pool.poolAddress}`);
  } catch (error: any) {
    pool = await ajna.nonfungiblePoolFactory.getPool(collateralAddress, subset, quoteAddress);

    if (error) {
      const parsed = parseNodeError(pool.contract.interface, error);
      console.log(`parsed:`, parsed);
      return;
    }

    const tx = await ajna.nonfungiblePoolFactory.deploySubsetPool(
      signer,
      nftAddress || collateralAddress,
      subset,
      quoteAddress,
      interestRate
    );
    console.log(
      `Deploying Subset Pool from: ${tx.from}\nNFT address: ${
        nftAddress || collateralAddress
      }\nQuote token address: ${quoteAddress}\nSubset: ${subset}`
    );

    await tx.verifyAndSubmit();

    const addr = await ajna.nonfungiblePoolFactory.getPoolAddress(
      nftAddress || collateralAddress,
      subset,
      quoteAddress
    );

    console.log(`Subset Pool deployed to: ${addr}`);
  }
}

// =============================================================================

const menuOptions = `
Please select an option:
- 1: Deploy fungible pool
- 2: Deploy NFT Collection pool
- 3: Deploy NFT Subset pool
`;

async function askInterestRate() {
  const interest = await input({ message: 'Enter Interest rate (default: 0.05)' });
  return toWad(interest || '0.05');
}

async function run() {
  const { ajna, signer } = await initAjna();
  const option = await input({
    message: menuOptions,
  });

  switch (option) {
    case '1': {
      return handleFungible(ajna, signer);
    }
    case '2': {
      const interestRate = await askInterestRate();
      return handleCollectionPool(ajna, signer, interestRate);
    }
    case '3': {
      const interestRate = await askInterestRate();
      return handleSubsetPool(ajna, signer, interestRate);
    }
  }
}

run().catch(error => {
  console.error(error);
  process.exit(1);
});
