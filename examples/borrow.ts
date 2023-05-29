#!/usr/bin/env ts-node

import { AjnaSDK } from '../src/classes/AjnaSDK';
import { Config } from '../src/classes/Config';
import { FungiblePool } from '../src/classes/FungiblePool';
import { addAccountFromKeystore } from '../src/utils/add-account';
import { fromWad, toWad, wdiv, wmul } from '../src/utils/numeric';
import { BigNumber, constants, providers } from 'ethers';
import { indexToPrice, priceToIndex } from '../src/utils/pricing';

// Configure from environment
const provider = new providers.JsonRpcProvider(process.env.ETH_RPC_URL);
const signerBorrower = addAccountFromKeystore(
  process.env.BORROWER_KEYSTORE || '',
  provider,
  process.env.BORROWER_PASSWORD || ''
);

Config.fromEnvironment();
const ajna = new AjnaSDK(provider);
const collateralAddress = process.env.COLLATERAL_TOKEN || '0x0';
const quoteAddress = process.env.QUOTE_TOKEN || '0x0';
let pool: FungiblePool;

// Gets instance of Pool object
async function getPool() {
  pool = await ajna.factory.getPool(collateralAddress, quoteAddress);
  if (pool.poolAddress === constants.AddressZero) {
    throw new Error('Pool not yet deployed; run lender script first');
  }
  return pool;
}

// Gets bucket index of initial price from which debt would be drawn
async function getPriceIndex(): Promise<number> {
  const prices = await pool.getPrices();
  console.log('Pool prices HPB: ', fromWad(prices.hpb), ' LUP: ', fromWad(prices.lup));
  if (prices.hpb.eq(BigNumber.from(0))) throw new Error('No liquidity in pool');
  return prices.lupIndex === 0 ? priceToIndex(prices.hpb) : priceToIndex(prices.lup);
}

// Draws debt without any regard to current debt or collateral pledged
async function makeLoan(debtToDraw: BigNumber, collateralization: BigNumber) {
  const priceIndex: number = await getPriceIndex();
  const price: BigNumber = indexToPrice(priceIndex);
  const limitIndex: number = priceIndex + 10;
  console.log('TX will revert if LUP has dropped below', fromWad(indexToPrice(limitIndex)));

  const collateralToPledge = wmul(wdiv(debtToDraw, price), collateralization);
  console.log(
    `${fromWad(collateralToPledge)} collateral required to draw`,
    `${fromWad(debtToDraw)} debt from ${fromWad(price)}`
  );
  let tx = await pool.collateralApprove(signerBorrower, collateralToPledge);
  await tx.verifyAndSubmit();
  tx = await pool.drawDebt(signerBorrower, debtToDraw, collateralToPledge, limitIndex);
  await tx.verifyAndSubmit();
  console.log('Drew', fromWad(debtToDraw), 'debt');
}

async function repayLoan(debtToRepay: BigNumber, collateralToPull: BigNumber) {
  let tx = await pool.quoteApprove(signerBorrower, debtToRepay);
  await tx.verifyAndSubmit();
  tx = await pool.repayDebt(signerBorrower, debtToRepay, collateralToPull);
  await tx.verifyAndSubmit();
}

async function run() {
  const pool = await getPool();
  console.log('Found pool at', pool.poolAddress);
  const stats = await pool.getStats();
  console.log('Pool has', fromWad(stats.poolSize.sub(stats.debt)), 'available to lend');
  const loan = await pool.getLoan(await signerBorrower.getAddress());
  console.log('Borrower has', fromWad(loan.debt), 'debt and', fromWad(loan.collateral), 'pledged');

  const action = process.argv.length > 2 ? process.argv[2] : '';

  if (action === 'draw') {
    const debtToDraw: BigNumber = process.argv.length > 3 ? toWad(process.argv[3]) : toWad(100);
    const collateralization = process.argv.length > 4 ? toWad(process.argv[4]) : toWad(1.25);
    await makeLoan(debtToDraw, collateralization);
    return;
  }
  if (action === 'repay') {
    const debtToRepay = process.argv.length > 3 ? toWad(process.argv[3]) : constants.MaxUint256;
    const pullCollateral = process.argv.length > 4 ? toWad(process.argv[4]) : loan.collateral;
    await repayLoan(debtToRepay, pullCollateral);
    return;
  }
}

run();
