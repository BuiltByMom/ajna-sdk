#!/usr/bin/env ts-node

import { BigNumber, Signer, constants } from 'ethers';
import { AjnaSDK } from '../src/classes/AjnaSDK';
import { fromWad, toWad, wdiv, wmul } from '../src/utils/numeric';
import { initAjna } from './utils';
import { CRAStatus, ClaimableReserveAuction } from '../src/classes/ClaimableReserveAuction';
import { Pool } from '../src/classes/Pool';
import { getAjnaTokenContract } from '../src/contracts/common';

const collateralAddress = process.env.COLLATERAL_TOKEN || '0x0';
const quoteAddress = process.env.QUOTE_TOKEN || '0x0';
let pool: Pool;
let cra: ClaimableReserveAuction;

// Gets instance of Pool object
async function getPool(ajna: AjnaSDK) {
  const pool = await ajna.fungiblePoolFactory.getPool(collateralAddress, quoteAddress);
  if (pool.poolAddress === constants.AddressZero) {
    throw new Error('Pool not yet deployed; run lender script first');
  }
  return pool;
}

// Approves AJNA and takes reserves
async function takeReserves(signerLender: Signer, maxAmount: BigNumber, status: CRAStatus) {
  const approvalAmount = wmul(maxAmount, status.price);
  console.log('Approving pool to spend', fromWad(approvalAmount), 'AJNA');
  let tx = await pool.ajnaApprove(signerLender, approvalAmount);
  await tx.verifyAndSubmit();
  tx = await cra.takeAndBurn(signerLender, maxAmount);
  const receipt = await tx.verifyAndSubmit();
  const eventLogs = tx.getEventLogs(receipt);
  const unclaimed = eventLogs.get('ReserveAuction')![0].args[0];
  console.log('Took reserves leaving', fromWad(unclaimed), 'unclaimed');
}

type Action = 'kick' | 'take';

async function run() {
  const { ajna, provider, signer: signerLender } = await initAjna('lender');
  pool = await getPool(ajna);
  console.log('Found pool at', pool.poolAddress);

  const stats = await pool.getStats();
  cra = await pool.getClaimableReserveAuction();
  let status = await cra.getStatus();
  if (await cra.isTakeable()) {
    console.log(
      'Reserve auction has',
      fromWad(status.claimableReservesRemaining),
      'claimable reserves remaining at price',
      fromWad(status.price),
      'all of which may be purchased for',
      fromWad(status.ajnaToBurn),
      'AJNA'
    );
  } else {
    console.log('Pool has', fromWad(stats.reserves), 'reserves');
  }
  const ajnaToken = getAjnaTokenContract(provider);
  const ajnaBalance = await ajnaToken.balanceOf(signerLender.address);
  console.log('User AJNA token balance', fromWad(ajnaBalance));

  const [, , action, amount] = process.argv;

  switch (action as Action) {
    case 'kick': {
      const tx = cra.kick(signerLender);
      (await tx).verifyAndSubmit();
      status = await cra.getStatus();
      console.log('Kicked auction for', fromWad(status.claimableReserves), 'reserves');
      return;
    }

    case 'take': {
      let takeAmount = amount ? toWad(amount) : status.claimableReservesRemaining;
      const ajnaRequiredToTake = wmul(takeAmount, status.price);
      if (ajnaRequiredToTake.gt(ajnaBalance)) takeAmount = wdiv(ajnaBalance, status.price);
      const cost = wmul(takeAmount, status.price);
      console.log('Taking', fromWad(takeAmount), 'reserves with', fromWad(cost), 'AJNA');
      await takeReserves(signerLender, takeAmount, status);
      return;
    }
  }
}

run();
