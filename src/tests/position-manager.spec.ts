import dotenv from 'dotenv';
import { BigNumber, providers } from 'ethers';
import { TEST_CONFIG as config } from './test-constants';
import { AjnaSDK } from '../classes/AjnaSDK';
import { addAccountFromKey } from '../utils/add-account';
import { getAddress } from 'ethers/lib/utils';
import { SdkError } from '../types';
import { priceToIndex } from '../utils';
import { Pool } from '../classes/Pool';

dotenv.config();
jest.setTimeout(1200000);

const LENDER_KEY = '0x2bbf23876aee0b3acd1502986da13a0f714c143fcc8ede8e2821782d75033ad1';
const TESTA_TDAI_POOL = '0x9b77d3c37fedb8d1d8cf5174708ed56163ad8fe4';

describe('LP Token and PositionManager', () => {
  const provider = new providers.JsonRpcProvider(config.ETH_RPC_URL);
  const ajna = new AjnaSDK(provider);
  let pool: Pool;
  const signerLender = addAccountFromKey(LENDER_KEY, provider);

  beforeAll(async () => {
    pool = await ajna.factory.getPoolByAddress(TESTA_TDAI_POOL);
  });

  it('should mint and burn LP token', async () => {
    let res = await pool.mintLPToken(signerLender);
    const tokenId = res.event.args.tokenId;

    const lpToken = pool.getLPToken(tokenId);
    const tokenURI = await lpToken.tokenURI();

    expect(tokenURI).toContain('data:application/json;base64');
    expect(res.event.args.lender).toBe(getAddress(signerLender.address));
    expect(res.event.args.pool).toBe(getAddress(TESTA_TDAI_POOL));
    expect(res.event.args.tokenId.toString()).toBe(tokenId.toString());

    res = await pool.burnLPToken(signerLender, tokenId);
    expect(res.event.args.lender).toBe(getAddress(signerLender.address));
    expect(res.event.args.tokenId.toString()).toBe(tokenId.toString());
  });

  it('should memorialize and then redeem an LP position', async () => {
    const poolStats = await pool.getStats();
    const bucket = await pool.getBucketByPrice(poolStats.debt);
    const index = priceToIndex(bucket.price);
    expect(bucket.index).toBe(index);

    let res = await pool.mintLPToken(signerLender);
    const tokenId = res.event.args.tokenId;
    const lpToken = pool.getLPToken(tokenId);
    expect(lpToken.tokenId.toString()).toBe(tokenId.toString());
    expect(res.event.args.lender).toBe(getAddress(signerLender.address));
    expect(res.event.args.pool).toBe(getAddress(TESTA_TDAI_POOL));
    expect(res.event.args.tokenId.toString()).toBe(tokenId.toString());

    try {
      let res = await lpToken.memorializePositions(signerLender, pool, tokenId);
      const tokenId2 = BigNumber.from(res.event.args.tokenId);
      expect(tokenId2.toString()).toBe('2');
      expect(res.event.args.lender).toBe(getAddress(signerLender.address));
      expect(res.event.args.tokenId.toString()).toBe(tokenId2.toString());
      expect(res.event.args.indexes).toEqual([]);

      res = await pool.approvePositionManagerLPTransferor(signerLender);
      expect(res.event.args.lender).toBe(getAddress(signerLender.address));
      expect(res.event.args.transferors).toEqual([lpToken.contractPositionManager.address]);

      res = await lpToken.redeemPositions(signerLender, pool.poolAddress, tokenId2);
      expect(res.event.args.lender).toBe(getAddress(signerLender.address));
      expect(res.event.args.tokenId.toString()).toBe(tokenId2.toString());
      expect(res.event.args.indexes).toEqual([]);
    } catch (error: any) {
      console.log(`ERROR:`, error);
      throw new SdkError(error.message, error);
    }
  });
});
