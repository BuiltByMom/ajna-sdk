import dotenv from 'dotenv';
import { BigNumber, providers } from 'ethers';
import { TEST_CONFIG as config } from './test-constants';
import { AjnaSDK } from '../classes/AjnaSDK';
import { FungiblePool } from '../classes/FungiblePool';
import { addAccountFromKey } from '../utils/add-account';
import { submitAndVerifyTransaction } from './test-utils';

dotenv.config();
jest.setTimeout(1200000);

const LENDER_KEY = '0x2bbf23876aee0b3acd1502986da13a0f714c143fcc8ede8e2821782d75033ad1';
const TESTA_TDAI_POOL = '0x845e5B204859f61b1EE99D60A9ff440d972Cde1C';

describe('LP Token and PositionManager', () => {
  const provider = new providers.JsonRpcProvider(config.ETH_RPC_URL);
  const ajna = new AjnaSDK(provider);
  let pool: FungiblePool = {} as FungiblePool;
  const signerLender = addAccountFromKey(LENDER_KEY, provider);

  beforeAll(async () => {
    pool = await ajna.factory.getPoolByAddress(TESTA_TDAI_POOL);
  });

  it('should mint and burn LP token', async () => {
    let tx = await pool.mintLPToken(signerLender);
    await submitAndVerifyTransaction(tx);

    // TODO: get the tokenID from previous transaction
    const tokenId = BigNumber.from(1);
    const lpToken = pool.getLPToken(tokenId);
    const tokenURI = await lpToken.tokenURI();
    expect(tokenURI).toContain('data:application/json;base64');

    tx = await pool.burnLPToken(signerLender, tokenId);
    await submitAndVerifyTransaction(tx);
  });
});
