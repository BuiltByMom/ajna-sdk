import { BigNumber, Signer, providers } from 'ethers';
import { TEST_CONFIG as config } from './test-constants';
import { AjnaSDK } from '../classes/AjnaSDK';
import { addAccountFromKey } from '../utils/add-account';
import { submitAndVerifyTransaction } from './test-utils';
import { toWad } from '../utils';
import { Pool } from '../classes/Pool';
import { getLP, getPositionManagerContract } from '../contracts/position-manager';

jest.setTimeout(1200000);

const LENDER_KEY = '0x2bbf23876aee0b3acd1502986da13a0f714c143fcc8ede8e2821782d75033ad1';
const NOT_LENDER_KEY = '0x997f91a295440dc31eca817270e5de1817cf32fa99adc0890dc71f8667574391';
const TESTD_TDAI_POOL = '0xe8dCc8FbAb00cF7911944dE5f9080Ecd9f25d3A9';

async function addQuoteTokensByIndexes(
  signer: Signer,
  pool: Pool,
  indexes: Array<number>,
  amounts: Array<BigNumber>
) {
  const totalAmounts = amounts.reduce((a, b) => a.add(b));
  const res = await pool.quoteApprove(signer, totalAmounts);
  await submitAndVerifyTransaction(res);

  let i = 0;
  for (const index of indexes) {
    const bucket = await pool.getBucketByIndex(index);
    const res = await bucket.addQuoteToken(signer, amounts[i]);
    await submitAndVerifyTransaction(res);
    i++;
  }
}

describe('LP Token and PositionManager', () => {
  const provider = new providers.JsonRpcProvider(config.ETH_RPC_URL);
  const ajna = new AjnaSDK(provider);
  let pool: Pool;
  const signerLender = addAccountFromKey(LENDER_KEY, provider);
  const signerNotLender = addAccountFromKey(NOT_LENDER_KEY, provider);

  beforeAll(async () => {
    pool = await ajna.fungiblePoolFactory.getPoolByAddress(TESTD_TDAI_POOL);
  });

  it('should mint and burn LP token', async () => {
    const mintTx = await pool.mintLPToken(signerLender);
    const mintReceipt = await submitAndVerifyTransaction(mintTx);
    expect(mintReceipt).toHaveProperty('logs');

    const mintEventLogs = mintTx.getEventLogs(mintReceipt).get('Mint')![0];
    const tokenId = mintEventLogs.args['tokenId'];
    const lpToken = pool.getLPToken(tokenId);
    const tokenURI = await lpToken.tokenURI();
    expect(tokenURI).toContain('data:application/json;base64');

    const burnTx = await pool.burnLPToken(signerLender, tokenId);
    const burnReceipt = await submitAndVerifyTransaction(burnTx);
    expect(burnReceipt).toHaveProperty('logs');
  });

  it('should memorialize and then redeem an LP position', async () => {
    const bucketIndex = 2550;
    const amount = toWad(200);

    await addQuoteTokensByIndexes(signerLender, pool, [bucketIndex], [amount]);

    const mintTx = await pool.mintLPToken(signerLender);
    const mintReceipt = await submitAndVerifyTransaction(mintTx);
    expect(mintReceipt).toHaveProperty('logs');

    const mintEventLogs = mintTx.getEventLogs(mintReceipt).get('Mint')![0];
    const tokenId = mintEventLogs.args['tokenId'];
    const lpToken = pool.getLPToken(tokenId);
    expect(lpToken.tokenId.toString()).toBe(tokenId.toString());

    // check in position (should be false)
    let inPosition = await lpToken.isIndexInPosition(bucketIndex);
    expect(inPosition).toBe(false);

    let lp = await getLP(signerLender, tokenId, bucketIndex);
    expect(lp.toString()).toBe('0');

    // Increase LP allowance
    let response = await pool.increaseLPAllowance(signerLender, [bucketIndex], [amount]);
    await submitAndVerifyTransaction(response);
    // Approve position manager to transfer LP token on behalf of signerLender
    response = await pool.approvePositionManagerLPTransferor(signerLender);
    await submitAndVerifyTransaction(response);

    // check in position (should still be false)
    inPosition = await lpToken.isIndexInPosition(bucketIndex);
    expect(inPosition).toBe(false);

    // memorialize positions
    response = await lpToken.memorializePositions(signerLender, pool.contract, tokenId, [
      bucketIndex,
    ]);
    await submitAndVerifyTransaction(response);

    lp = await getLP(signerLender, tokenId, bucketIndex);
    expect(lp.toString()).toBe(amount.toString());

    // check in position (should be true)
    inPosition = await lpToken.isIndexInPosition(bucketIndex, tokenId);
    expect(inPosition).toBe(true);
    // check in position for nonexistant tokenId
    const wrongLpToken = pool.getLPToken(BigNumber.from(999));
    inPosition = await wrongLpToken.isIndexInPosition(bucketIndex);
    expect(inPosition).toBe(false);

    // Redeem positions: with get the bucket id by calling `pm.getPositionIndexes`
    response = await lpToken.redeemPositions(signerLender, pool.contract.address, tokenId, [
      bucketIndex,
    ]);
    await submitAndVerifyTransaction(response);
  });

  it('increaseLPAllowance should throw exception if indexes and amounts not the same length', async () => {
    await expect(async () => {
      await pool.increaseLPAllowance(signerLender, [2550, 2549], [toWad(200)]);
    }).rejects.toThrow('indexes and amounts must be same length');
  });

  it('should memorialize and redeem an LP position with multiple indexes', async () => {
    const indices = [2551, 2552, 2553];
    const amounts = [toWad(10), toWad(20), toWad(30)];
    const pm = await getPositionManagerContract(signerLender);

    await addQuoteTokensByIndexes(signerLender, pool, indices, amounts);

    let tx = await pool.mintLPToken(signerLender);
    const mintReceipt = await submitAndVerifyTransaction(tx);

    const mintEventLogs = tx.getEventLogs(mintReceipt).get('Mint')![0];
    const tokenId = mintEventLogs.args['tokenId'];
    const lpToken = pool.getLPToken(tokenId);

    const response = await pool.increaseLPAllowance(signerLender, indices, amounts);
    await submitAndVerifyTransaction(response);

    const approveTx = await pool.approvePositionManagerLPTransferor(signerLender);
    const approveReceipt = await submitAndVerifyTransaction(approveTx);
    expect(approveReceipt).toHaveProperty('logs');

    for (const index of indices) {
      // check in position (should be false)
      const inPosition = await lpToken.isIndexInPosition(index);
      expect(inPosition).toBe(false);
    }

    tx = await lpToken.memorializePositions(signerLender, pool.contract, tokenId, indices);
    const receipt1 = await submitAndVerifyTransaction(tx);
    expect(receipt1).toHaveProperty('logs');

    for (const index of indices) {
      // check in position (should be true)
      const inPosition = await lpToken.isIndexInPosition(index);
      expect(inPosition).toBe(true);
    }

    const pis = await pm.getPositionIndexes(tokenId);
    expect(pis.length).toBe(3);
    expect(pis.map(pi => pi.toNumber())).toEqual(indices);

    tx = await lpToken.redeemPositions(signerNotLender, pool.poolAddress, tokenId, indices);
    await expect(async () => {
      await tx.verify();
    }).rejects.toThrow(`NoAuth()`);

    tx = await lpToken.redeemPositions(signerLender, pool.poolAddress, tokenId, indices);
    await submitAndVerifyTransaction(tx);
  });
});
