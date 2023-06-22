import dotenv from 'dotenv';
import { BigNumber, providers } from 'ethers';
import { TEST_CONFIG as config } from './test-constants';
import { AjnaSDK } from '../classes/AjnaSDK';
import { FungiblePool } from '../classes/FungiblePool';
import { addAccountFromKey } from '../utils/add-account';
import { submitAndVerifyTransaction } from './test-utils';
import { SdkError } from '../types';
import { priceToIndex } from '../utils';

dotenv.config();
jest.setTimeout(1200000);

const LENDER_KEY = '0x2bbf23876aee0b3acd1502986da13a0f714c143fcc8ede8e2821782d75033ad1';
const TESTA_TDAI_POOL = '0x9b77d3c37fedb8d1d8cf5174708ed56163ad8fe4';

describe('LP Token and PositionManager', () => {
  const provider = new providers.JsonRpcProvider(config.ETH_RPC_URL);
  const ajna = new AjnaSDK(provider);
  let pool: FungiblePool = {} as FungiblePool;
  const signerLender = addAccountFromKey(LENDER_KEY, provider);

  beforeAll(async () => {
    pool = await ajna.factory.getPoolByAddress(TESTA_TDAI_POOL);
  });

  it('should mint and burn LP token', async () => {
    const mintTx = await pool.mintLPToken(signerLender);
    const mintReceipt = await submitAndVerifyTransaction(mintTx);
    expect(mintReceipt).toHaveProperty('logs');

    const tokenId = BigNumber.from(mintReceipt.logs[1].data);
    const lpToken = pool.getLPToken(tokenId);
    const tokenURI = await lpToken.tokenURI();
    expect(tokenURI).toContain('data:application/json;base64');

    const burnTx = await pool.burnLPToken(signerLender, tokenId);
    const burnReceipt = await submitAndVerifyTransaction(burnTx);
    expect(burnReceipt).toHaveProperty('logs');
  });

  it('should memorialize and then redeem an LP position', async () => {
    const poolStats = await pool.getStats();
    const bucket = await pool.getBucketByPrice(poolStats.debt);
    const index = priceToIndex(bucket.price);
    expect(bucket.index).toBe(index);

    const mintTx = await pool.mintLPToken(signerLender);
    const receipt = await submitAndVerifyTransaction(mintTx);
    expect(receipt).toHaveProperty('logs');
    const tokenId = BigNumber.from(receipt.logs[1].data);

    const lpToken = pool.getLPToken(tokenId);
    expect(lpToken.tokenId.toString()).toBe(tokenId.toString());

    try {
      const memorializeTxReceipt = await lpToken.memorializePositions(signerLender, pool, tokenId);
      expect(memorializeTxReceipt).toHaveProperty('logs');
      expect(memorializeTxReceipt.logs[0].data).toContain(
        signerLender.address.slice(2).toLowerCase()
      );
      const tokenId2 = BigNumber.from(memorializeTxReceipt.logs[1].data.slice(10, 66));
      expect(tokenId2.toString()).toBe('2');

      const approveTx = await pool.approveLPTransferors(signerLender, [
        lpToken.contractPositionManager.address,
      ]);

      const approveReceipt = await submitAndVerifyTransaction(approveTx);
      expect(approveReceipt).toHaveProperty('logs');

      const redeemTx = await lpToken.redeemPositions(signerLender, pool.poolAddress, tokenId2);
      expect(redeemTx).toHaveProperty('logs');
    } catch (error: any) {
      console.log(`ERROR:`, error);
      throw new SdkError(error.message, error);
    }
  });
});
