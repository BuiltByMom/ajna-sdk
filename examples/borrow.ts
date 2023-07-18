#!/usr/bin/env ts-node

import { AjnaSDK } from '../src/classes/AjnaSDK';
import { FungiblePool } from '../src/classes/FungiblePool';
import { fromWad, toWad, wdiv, wmul } from '../src/utils/numeric';
import { BigNumber, Signer, constants } from 'ethers';
import { indexToPrice, priceToIndex } from '../src/utils/pricing';
import { Stats } from '../src/classes/Pool';
import dotenv from 'dotenv';
import { Loan } from '../src/types';
import { initAjna } from './utils';

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

// Estimates where LUP will be after debt has been drawn
async function estimateNewLup(
  pool: FungiblePool,
  existingPoolDebt: BigNumber,
  newDebt: BigNumber
): Promise<BigNumber> {
  const newLup = indexToPrice(await pool.depositIndex(existingPoolDebt.add(newDebt)));
  console.log('Drawing', fromWad(newDebt), 'would push LUP down to', fromWad(newLup));
  return newLup;
}

// Draw new debt and/or adjust collateralization of existing loan
async function adjustLoan(
  pool: FungiblePool,
  signerBorrower: Signer,
  poolStats: Stats,
  currentLoan: Loan,
  debtToDraw: BigNumber,
  collateralization: BigNumber
) {
  // determine borrower's total new debt
  const originationFee = wmul(debtToDraw, await pool.getOriginationFeeRate());
  const debtToDrawWithFee = debtToDraw.add(originationFee);
  const proposedBorrowerDebt = currentLoan.debt.add(debtToDrawWithFee);
  if (proposedBorrowerDebt.eq(toWad(0))) {
    console.log('No existing or new debt; nothing to recollateralize');
    return;
  }

  // estimate where the LUP would be with additional debt
  const price: BigNumber = await estimateNewLup(pool, poolStats.debt, debtToDrawWithFee);
  // revert if LUP drops more than 10 buckets below our estimate before TX processed
  const limitIndex: number = priceToIndex(price) + 10;
  console.log('TX will revert if LUP has dropped below', fromWad(indexToPrice(limitIndex)));

  // determine how much collateral needed to achieve desired total collateralization
  const totalCollateralRequired = wmul(wdiv(proposedBorrowerDebt, price), collateralization);
  const collateralToPledge = totalCollateralRequired.sub(currentLoan.collateral);

  if (collateralToPledge.gt(toWad(0))) {
    console.log(
      `Will pledge ${fromWad(collateralToPledge)} collateral to achieve ${fromWad(
        collateralization
      )} borrower collateralization`
    );
    // submit TXes to approve and draw new debt
    let tx = await pool.collateralApprove(signerBorrower, collateralToPledge);
    await tx.verifyAndSubmit();
    tx = await pool.drawDebt(signerBorrower, debtToDraw, collateralToPledge, limitIndex);
    await tx.verifyAndSubmit();
    console.log('Drew', fromWad(debtToDraw), 'debt');
  } else {
    // submit TX to pull collateral
    const collateralToPull = collateralToPledge.mul(-1);
    const tx = await pool.repayDebt(signerBorrower, toWad(0), collateralToPull);
    await tx.verifyAndSubmit();
    console.log(
      `Pulled ${fromWad(collateralToPull)} collateral to reduce collateralization to ${fromWad(
        collateralization
      )}`
    );
  }
}

async function repayLoan(
  pool: FungiblePool,
  signerBorrower: Signer,
  debtToRepay: BigNumber,
  collateralToPull: BigNumber
) {
  let tx = await pool.quoteApprove(signerBorrower, debtToRepay);
  await tx.verifyAndSubmit();
  tx = await pool.repayDebt(signerBorrower, debtToRepay, collateralToPull);
  await tx.verifyAndSubmit();
  const repaymentAmountString = debtToRepay.eq(constants.MaxUint256) ? 'all' : fromWad(debtToRepay);
  console.log('Repaid', repaymentAmountString, 'debt');
}

async function run() {
  const { ajna, signer: signerBorrower } = await initAjna('borrower');
  const pool = await getPool(ajna);

  // const pool = await getPool();
  console.log('Found pool at', pool.poolAddress);
  const stats = await pool.getStats();
  console.log('Pool has', fromWad(stats.poolSize.sub(stats.debt)), 'available to lend');
  const loan = await pool.getLoan(await signerBorrower.getAddress());
  console.log(
    `Borrower has ${fromWad(loan.debt)} debt with ${fromWad(loan.collateral)} pledged`,
    `and is ${fromWad(loan.collateralization)} collateralized`
  );

  const action = process.argv.length > 2 ? process.argv[2] : '';

  if (action === 'draw') {
    const debtToDraw: BigNumber = process.argv.length > 3 ? toWad(process.argv[3]) : toWad(100);
    const collateralization = process.argv.length > 4 ? toWad(process.argv[4]) : toWad(1.25);
    await adjustLoan(pool, signerBorrower, stats, loan, debtToDraw, collateralization);
    return;
  }
  if (action === 'repay') {
    const debtToRepay = process.argv.length > 3 ? toWad(process.argv[3]) : constants.MaxUint256;
    const pullCollateral = process.argv.length > 4 ? toWad(process.argv[4]) : loan.collateral;
    await repayLoan(pool, signerBorrower, debtToRepay, pullCollateral);
    return;
  }
}

run();
