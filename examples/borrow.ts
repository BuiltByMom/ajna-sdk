#!/usr/bin/env ts-node

import { AjnaSDK } from '../src/classes/AjnaSDK';
import { Config } from '../src/classes/Config';
import { FungiblePool } from '../src/classes/FungiblePool';
import { SdkError } from '../src/classes/types';
import { addAccountFromKeystore } from '../src/utils/add-account';
import { fromWad, toWad, wdiv, wmul } from '../src/utils/numeric';
import { BigNumber, constants, providers } from 'ethers';
import { indexToPrice, priceToIndex } from '../src/utils/pricing';

// Configure from environment
const provider = new providers.JsonRpcProvider(process.env.ETH_RPC_URL);
// Use this for local testnets, where JSON keystores are unavailable.
// const signerLender = addAccountFromKey(process.env.ETH_KEY || '', provider);
// Use this for a real chain, such as Goerli or Mainnet.
const signerBorrower = addAccountFromKeystore(process.env.BORROWER_KEYSTORE || '', provider);
if (!signerBorrower) throw new SdkError('Wallet not unlocked');

Config.fromEnvironment();
const ajna = new AjnaSDK(provider);
const collateralAddress = process.env.COLLATERAL_TOKEN || '0x0';
const quoteAddress = process.env.QUOTE_TOKEN || '0x0';
let pool: FungiblePool;

// Looks for pool, deploying it if it doesn't already exist
const getPool = async () => {
  pool = await ajna.factory.getPool(collateralAddress, quoteAddress);
  if (pool.poolAddress === constants.AddressZero) {
    throw new Error('Pool not yet deployed; run lender script first');
  }
  return pool;
};

// Gets bucket index of initial price from which debt would be drawn
const getPriceIndex = async (): Promise<number> => {
  const prices = await pool.getPrices();
  console.log('Pool prices HPB: ', fromWad(prices.hpb), ' LUP: ', fromWad(prices.lup));
  if (prices.hpb.eq(BigNumber.from(0))) throw new Error('No liquidity in pool');
  return prices.lup.eq(BigNumber.from(0)) ? priceToIndex(prices.hpb) : priceToIndex(prices.lup);
};

const makeLoan = async (debtToDraw: BigNumber, collateralization: BigNumber) => {
  const priceIndex: number = await getPriceIndex();
  const price: BigNumber = indexToPrice(priceIndex);
  const limitIndex: number = priceIndex + 10;
  console.log('TX will revert if LUP has dropped below', fromWad(indexToPrice(limitIndex)));

  const collateralToPledge = wmul(wdiv(debtToDraw, price), collateralization);
  console.log(
    fromWad(collateralToPledge),
    ' required to draw ',
    fromWad(debtToDraw),
    ' debt from ',
    fromWad(price)
  );
  let tx = await pool.collateralApprove(signerBorrower, collateralToPledge);
  await tx.verifyAndSubmit();
  tx = await pool.drawDebt(signerBorrower, debtToDraw, collateralToPledge, limitIndex);
  await tx.verifyAndSubmit();
};

export const run = async () => {
  const pool = await getPool();
  console.log('Found pool at ', pool.poolAddress);
  const stats = await pool.getStats();
  const debtInfo = await pool.debtInfo();
  console.log('Pool has ', fromWad(stats.poolSize.sub(debtInfo.pendingDebt)), ' available to lend');

  // TODO: parse action 'draw' or 'repay'

  const debtToDraw: BigNumber = process.argv.length > 2 ? toWad(process.argv[2]) : toWad(100);
  const collateralization: BigNumber =
    process.argv.length > 3 ? toWad(process.argv[3]) : toWad(1.25);

  await makeLoan(debtToDraw, collateralization);
};

run();
