#!/usr/bin/env ts-node

import { toWad } from '../src/utils/numeric';
import { BigNumber, Signer } from 'ethers';
import dotenv from 'dotenv';
import { initAjna, formatBNsInObjectFromWad } from './utils';
import { AjnaSDK } from '../src/classes/AjnaSDK';
import { input } from '@inquirer/prompts';
import { Address } from '../src/types';
import { FungiblePool } from '../src/classes/FungiblePool';
import { Pool } from '../src/classes/Pool';
import { NonfungiblePool } from '../src/classes/NonfungiblePool';

dotenv.config();

const collateralAddress = process.env.COLLATERAL_TOKEN || '0x0';
const quoteAddress = process.env.QUOTE_TOKEN || '0x0';

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
    console.log(
      `Deploying Fungible Pool from: ${await signer.getAddress()}\nCollateral token address: ${collateralAddress}\nQuote token address: ${quoteAddress}`
    );
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
    const tx = await ajna.nonfungiblePoolFactory.deployCollectionPool(
      signer,
      collateralAddress,
      quoteAddress,
      interestRate
    );

    console.log(
      `Deploying Collection Pool from: ${await signer.getAddress()}\nNFT address: ${collateralAddress}\nQuote token address: ${quoteAddress}`
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

async function handleSubsetPool(ajna: AjnaSDK, signer: Signer, interestRate: BigNumber) {
  let pool: NonfungiblePool;
  const tokenIdsInput = await input({
    message: 'Enter subset token IDs separated by comma (<number,number>): 1,2,3',
  });
  const tokenIdsSplit = tokenIdsInput.split(',');
  const subset = tokenIdsSplit.reduce((acc: Array<number>, val: any) => {
    try {
      return [...acc, parseInt(val)];
    } catch (error) {
      return acc;
    }
  }, []);

  try {
    pool = await ajna.nonfungiblePoolFactory.getPool(collateralAddress, subset, quoteAddress);
    await printPoolDetails(pool);
    console.log(`Nunfungible Subset Pool already exists: ${pool.poolAddress}`);
  } catch (error: any) {
    const tx = await ajna.nonfungiblePoolFactory.deploySubsetPool(
      signer,
      collateralAddress,
      subset,
      quoteAddress,
      interestRate
    );

    console.log(
      `Deploying Subset Pool from: ${await signer.getAddress()}\nNFT address: ${collateralAddress}\nQuote token address: ${quoteAddress}\nSubset: ${subset}`
    );
    await tx.verifyAndSubmit();

    const addr = await ajna.nonfungiblePoolFactory.getPoolAddress(
      collateralAddress,
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
