import { constants, providers } from 'ethers';
import { AjnaSDK } from '../classes/AjnaSDK';
import { TEST_CONFIG as config } from './test-constants';
import { addAccountFromKey } from '../utils/add-account';
import { toWad } from '../utils';

const TDUCK_ADDRESS = '0x1fb7972C722716F39DADF20967c6345dA223D943';
const TUSDC_ADDRESS = '0x72BB61e78fcB9dB3b5B3C8035BD9edAB5edd601E';
const LENDER_KEY = '0xaf12577dbd6c3f4837fe2ad515009f9f71b03ce8ba4a59c78c24fb5f445b6d01';

describe('ERC721 Pool', () => {
  const provider = new providers.JsonRpcProvider(config.ETH_RPC_URL);
  const ajna = new AjnaSDK(provider);
  const signerLender = addAccountFromKey(LENDER_KEY, provider);

  // FIXME: this fails with an error in createTransaction
  it.skip('should create NFT collection pool', async () => {
    const tx = await ajna.nonfungiblePoolFactory.deployCollectionPool(
      signerLender,
      TDUCK_ADDRESS,
      TUSDC_ADDRESS,
      toWad('0.03')
    );
    await tx.verifyAndSubmit();
    const pool = await ajna.fungiblePoolFactory.getPool(TDUCK_ADDRESS, TUSDC_ADDRESS);
    expect(pool).toBeDefined();
    expect(pool.poolAddress).not.toBe(constants.AddressZero);
    expect(pool.collateralAddress).toBe(TDUCK_ADDRESS);
    expect(pool.quoteAddress).toBe(TUSDC_ADDRESS);
    expect(pool.toString()).toContain('TWETH-TDAI');
  });
});
