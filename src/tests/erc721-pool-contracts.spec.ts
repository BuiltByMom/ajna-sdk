import { constants, providers } from 'ethers';
import { AjnaSDK } from '../classes/AjnaSDK';
import { Address } from '../types';
import { NonfungiblePool } from '../classes/NonfungiblePool';
import { toWad } from '../utils';
import { addAccountFromKey } from '../utils/add-account';
import { TEST_CONFIG as config } from './test-constants';

const TDUCK_ADDRESS = '0x1fb7972C722716F39DADF20967c6345dA223D943';
const TESTA_ADDRESS = '0x919ae2c42A69ebD939262F39b4dAdAFDBf9eB374';
const TUSDC_ADDRESS = '0x72BB61e78fcB9dB3b5B3C8035BD9edAB5edd601E';
const TDAI_ADDRESS = '0x53D10CAFE79953Bf334532e244ef0A80c3618199';
const TWETH_ADDRESS = '0xc17985054Cab9CEf76ec024820dAaaC50CE1ad85';
const LENDER_KEY = '0xaf12577dbd6c3f4837fe2ad515009f9f71b03ce8ba4a59c78c24fb5f445b6d01';

describe('ERC721 Pool', () => {
  const provider = new providers.JsonRpcProvider(config.ETH_RPC_URL);
  const ajna = new AjnaSDK(provider);
  const signerLender = addAccountFromKey(LENDER_KEY, provider);
  let poolDuckDai: NonfungiblePool;

  const createPool = async (
    nftAddress: Address,
    subset: any,
    quoteAddress: Address
  ): Promise<NonfungiblePool> => {
    const tx = await ajna.nonfungiblePoolFactory.deploySubsetPool(
      signerLender,
      nftAddress,
      subset,
      quoteAddress,
      toWad('0.05')
    );
    await tx.verifyAndSubmit();

    return await ajna.nonfungiblePoolFactory.getPool(nftAddress, subset, quoteAddress);
  };

  beforeAll(async () => {
    poolDuckDai = await createPool(TDUCK_ADDRESS, [1, 2, 3], TDAI_ADDRESS);
    await createPool(TDUCK_ADDRESS, [], TWETH_ADDRESS);
  });

  it('new subset pool should be deployed successfully', async () => {
    const tx = await ajna.nonfungiblePoolFactory.deploySubsetPool(
      signerLender,
      TDUCK_ADDRESS,
      [1, 2],
      TESTA_ADDRESS,
      toWad('0.05')
    );
    await tx.verifyAndSubmit();

    const pool = await ajna.nonfungiblePoolFactory.getPool(TDUCK_ADDRESS, [1, 2], TESTA_ADDRESS);
    expect(pool).toBeDefined();
    expect(pool.poolAddress).not.toBe(constants.AddressZero);
    expect(pool.collateralAddress).toBe(TDUCK_ADDRESS);
    expect(pool.quoteAddress).toBe(TESTA_ADDRESS);
    expect(pool.toString()).toContain('TDUCK-TESTA');
  });

  it('existing subset pool should not be deployed', async () => {
    const tx = await ajna.nonfungiblePoolFactory.deploySubsetPool(
      signerLender,
      TDUCK_ADDRESS,
      [1, 2, 3],
      TDAI_ADDRESS,
      toWad('0.05')
    );
    await expect(async () => {
      await tx.verify();
    }).rejects.toThrow('PoolAlreadyExists(address)');
  });

  // deployCollectionPool
  it('new collection pool should be deployed successfully', async () => {
    const tx = await ajna.nonfungiblePoolFactory.deployCollectionPool(
      signerLender,
      TDUCK_ADDRESS,
      TUSDC_ADDRESS,
      toWad('0.03')
    );
    await tx.verifyAndSubmit();

    const pool = await ajna.nonfungiblePoolFactory.getPool(TDUCK_ADDRESS, [], TUSDC_ADDRESS);
    expect(pool).toBeDefined();
    expect(pool.poolAddress).not.toBe(constants.AddressZero);
    expect(pool.collateralAddress).toBe(TDUCK_ADDRESS);
    expect(pool.quoteAddress).toBe(TUSDC_ADDRESS);
    expect(pool.toString()).toContain('TDUCK-TUSDC');
  });

  it('existing collection pool should not be deployed', async () => {
    const tx = await ajna.nonfungiblePoolFactory.deployCollectionPool(
      signerLender,
      TDUCK_ADDRESS,
      TWETH_ADDRESS,
      toWad('0.03')
    );
    await expect(async () => {
      await tx.verify();
    }).rejects.toThrow('PoolAlreadyExists(address)');
  });

  it('getPool should return existing collection pool when given existing collateral, subset and quote addresses', async () => {
    const pool = await ajna.nonfungiblePoolFactory.getPool(TDUCK_ADDRESS, [1, 2, 3], TDAI_ADDRESS);
    expect(pool.poolAddress).not.toBe(constants.AddressZero);
    expect(pool.collateralAddress).toBe(TDUCK_ADDRESS);
    expect(pool.quoteAddress).toBe(TDAI_ADDRESS);
    expect(pool.name).toBe('TDUCK-TDAI');
  });

  it('getPool should return existing pool when given valid collateral and quote addresses', async () => {
    const pool = await ajna.nonfungiblePoolFactory.getPool(TDUCK_ADDRESS, [], TWETH_ADDRESS);
    expect(pool.poolAddress).not.toBe(constants.AddressZero);
    expect(pool.collateralAddress).toBe(TDUCK_ADDRESS);
    expect(pool.quoteAddress).toBe(TWETH_ADDRESS);
    expect(pool.name).toBe('TDUCK-TWETH');
  });

  it('getPoolByAddress should return existing pool when given existing pool address', async () => {
    const pool = await ajna.nonfungiblePoolFactory.getPoolByAddress(poolDuckDai.poolAddress);
    expect(pool.poolAddress).toBe(poolDuckDai.poolAddress);
  });

  it('getPoolAddress returns pool address when given existing pool requisites', async () => {
    const address = await ajna.nonfungiblePoolFactory.getPoolAddress(TDUCK_ADDRESS, [1, 2, 3], TDAI_ADDRESS)
    expect(address).toBe(poolDuckDai.poolAddress)
  });

  it('getPoolAddress returns AddressZero when non existing token pair specified', async () => {
    const address = await ajna.nonfungiblePoolFactory.getPoolAddress(
      TDUCK_ADDRESS,
      [1, 2, 3],
      TWETH_ADDRESS
    );
    expect(address).toBe(constants.AddressZero);
  });

  it.skip('getPoolAddress returns AddressZero when non existing token pair specified', async () => {
    const address = await ajna.nonfungiblePoolFactory.getPoolAddress(
      TDUCK_ADDRESS,
      [],
      TDAI_ADDRESS
    );
    expect(address).toBe(constants.AddressZero);
  });
});
