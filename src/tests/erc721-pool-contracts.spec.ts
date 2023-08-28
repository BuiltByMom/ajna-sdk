import { constants, providers } from 'ethers';
import { expect } from '@jest/globals';
import { AjnaSDK } from '../classes/AjnaSDK';
import { NonfungiblePool } from '../classes/NonfungiblePool';
import { getNftContract } from '../contracts/erc721';
import { Address } from '../types';
import { priceToIndex, toWad } from '../utils';
import { addAccountFromKey } from '../utils/add-account';
import { TEST_CONFIG as config } from './test-constants';
import { submitAndVerifyTransaction } from './test-utils';

jest.setTimeout(60000);

const TDUCK_ADDRESS = '0xaf36Ce3FD234ba81A9d4676CD09fC6700f087146';
const TGOOSE_ADDRESS = '0x5D94D2fa949Ac3127C27CB344882fAafE70665Df';
const TESTA_ADDRESS = '0xf6C45B3B42b910110B1c750C959D0a396470c520';
const TUSDC_ADDRESS = '0x606A640CB77AeCBfefe918AebDCB34845FF18546';
const TDAI_ADDRESS = '0x4cEDCBb309d1646F3E91FB00c073bB28225262E6';
const TWETH_ADDRESS = '0x844f3C269f301f89D81f29B91b8d8ED2C69Fa7Bc';
const LENDER_KEY = '0xaf12577dbd6c3f4837fe2ad515009f9f71b03ce8ba4a59c78c24fb5f445b6d01';
const BOROWER_KEY = '0x8b4c4ea4246dd9c3404eda8ec30145dbe9c23744876e50b31dc8e9a0d26f0c25';

describe('ERC721 Pool', () => {
  const provider = new providers.JsonRpcProvider(config.ETH_RPC_URL);
  const ajna = new AjnaSDK(provider);
  const signerLender = addAccountFromKey(LENDER_KEY, provider);
  const signerBorrower = addAccountFromKey(BOROWER_KEY, provider);
  const tduck = getNftContract(TDUCK_ADDRESS, provider);
  let poolDuckDai: NonfungiblePool;
  let poolDuckDaiSubset: NonfungiblePool;

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
    poolDuckDai = await ajna.nonfungiblePoolFactory.getPool(TDUCK_ADDRESS, [], TDAI_ADDRESS);
    poolDuckDaiSubset = await createPool(TDUCK_ADDRESS, [23, 24, 25], TDAI_ADDRESS);
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
    expect(pool.toString()).toEqual('TDUCK-TESTA subset pool');
  });

  it('existing subset pool should not be deployed', async () => {
    const tx = await ajna.nonfungiblePoolFactory.deploySubsetPool(
      signerLender,
      TDUCK_ADDRESS,
      [23, 24, 25],
      TDAI_ADDRESS,
      toWad('0.05')
    );
    await expect(async () => {
      await tx.verify();
    }).rejects.toThrow('PoolAlreadyExists(address)');
  });

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
    expect(pool.toString()).toEqual('TDUCK-TUSDC collection pool');
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
    const pool = await ajna.nonfungiblePoolFactory.getPool(
      TDUCK_ADDRESS,
      [23, 24, 25],
      TDAI_ADDRESS
    );
    expect(pool.poolAddress).not.toBe(constants.AddressZero);
    expect(pool.collateralAddress).toBe(TDUCK_ADDRESS);
    expect(pool.quoteAddress).toBe(TDAI_ADDRESS);
    expect(pool.name).toBe('TDUCK-TDAI');
  });

  it('getPool should return existing pool when querying existing collection pool', async () => {
    const pool = await ajna.nonfungiblePoolFactory.getPool(TDUCK_ADDRESS, [], TWETH_ADDRESS);
    expect(pool.poolAddress).not.toBe(constants.AddressZero);
    expect(pool.collateralAddress).toBe(TDUCK_ADDRESS);
    expect(pool.quoteAddress).toBe(TWETH_ADDRESS);
    expect(pool.name).toBe('TDUCK-TWETH');
  });

  it('getPoolByAddress should return existing pool when given existing pool address', async () => {
    const pool = await ajna.nonfungiblePoolFactory.getPoolByAddress(poolDuckDaiSubset.poolAddress);
    expect(pool.poolAddress).toBe(poolDuckDaiSubset.poolAddress);
  });

  it('getPoolAddress returns pool address when querying existing subset pool', async () => {
    const address = await ajna.nonfungiblePoolFactory.getPoolAddress(
      TDUCK_ADDRESS,
      [23, 24, 25],
      TDAI_ADDRESS
    );
    expect(address).toBe(poolDuckDaiSubset.poolAddress);
  });

  it('getPoolAddress returns AddressZero when subset for token pair does not exist', async () => {
    const address = await ajna.nonfungiblePoolFactory.getPoolAddress(
      TDUCK_ADDRESS,
      [2, 3, 4],
      TDAI_ADDRESS
    );
    expect(address).toBe(constants.AddressZero);
  });

  it('getPoolAddress returns AddressZero when token pair does not exist', async () => {
    const address = await ajna.nonfungiblePoolFactory.getPoolAddress(
      TGOOSE_ADDRESS,
      [23, 24, 25],
      TWETH_ADDRESS
    );
    expect(address).toBe(constants.AddressZero);
  });

  it('getPoolAddress returns AddressZero when collection for token pair does not exist', async () => {
    const address = await ajna.nonfungiblePoolFactory.getPoolAddress(
      TGOOSE_ADDRESS,
      [],
      TDAI_ADDRESS
    );
    expect(address).toBe(constants.AddressZero);
  });

  it('getPoolAddress should reject non sorted subset', async () => {
    await expect(async () => {
      await ajna.nonfungiblePoolFactory.getPoolAddress(TGOOSE_ADDRESS, [26, 24, 25], TWETH_ADDRESS);
    }).rejects.toThrow('Token ids must be sorted');
  });

  it('liquidity may be added to and removed from a NFT pool', async () => {
    // add liquidity
    const quoteAmount = toWad(100);
    let tx = await poolDuckDaiSubset.quoteApprove(signerLender, quoteAmount);
    await submitAndVerifyTransaction(tx);
    const bucket = await poolDuckDaiSubset.getBucketByPrice(toWad(200));
    tx = await bucket.addQuoteToken(signerLender, quoteAmount);
    await submitAndVerifyTransaction(tx);
    let lpBalance = await bucket.lpBalance(signerLender.address);
    expect(lpBalance.gte(quoteAmount)).toBe(true);

    // remove liquidity
    tx = await bucket.removeQuoteToken(signerLender, constants.MaxUint256);
    await submitAndVerifyTransaction(tx);
    lpBalance = await bucket.lpBalance(signerLender.address);
    expect(lpBalance).toEqual(toWad(0));
  });

  it('collateral may be added to and removed from a bucket', async () => {
    // add collateral
    const tokenId = 24;
    const bucketId = priceToIndex(toWad(250));
    let tx = await poolDuckDaiSubset.collateralApprove(signerLender, tokenId);
    await submitAndVerifyTransaction(tx);
    tx = await poolDuckDaiSubset.addCollateral(signerLender, bucketId, [tokenId]);
    await submitAndVerifyTransaction(tx);
    const bucket = await poolDuckDaiSubset.getBucketByIndex(bucketId);
    let lpBalance = await bucket.lpBalance(signerLender.address);
    expect(lpBalance.gte(toWad(0))).toBe(true);

    // remove collateral
    tx = await poolDuckDaiSubset.removeCollateral(signerLender, bucketId, 1);
    await submitAndVerifyTransaction(tx);
    lpBalance = await bucket.lpBalance(signerLender.address);
    expect(lpBalance).toEqual(toWad(0));
  });

  it('debt may be drawn and repaid', async () => {
    // confirm existing state
    const initialStats = await poolDuckDai.getStats();
    expect(initialStats.poolSize).toEqual(toWad(10_000));
    expect(initialStats.debt).toBeBetween(toWad(400), toWad(500));
    let loan = await poolDuckDai.getLoan(signerBorrower.address);
    expect(loan.debt).toEqual(toWad(0));
    const tokenId = 25;
    expect(await tduck.ownerOf(tokenId)).toEqual(signerBorrower.address);

    // draw debt
    let tx = await poolDuckDai.collateralApprove(signerBorrower, tokenId);
    await submitAndVerifyTransaction(tx);
    const debtToDraw = toWad(400);
    tx = await poolDuckDai.drawDebt(signerBorrower, debtToDraw, [tokenId]);
    await submitAndVerifyTransaction(tx);
    let stats = await poolDuckDai.getStats();
    expect(stats.poolSize.gte(initialStats.poolSize)).toBe(true);
    expect(stats.debt).toBeBetween(toWad(800), toWad(900));
    loan = await poolDuckDai.getLoan(signerBorrower.address);
    expect(loan.debt).toBeBetween(toWad(400), toWad(450));
    expect(await tduck.ownerOf(tokenId)).toEqual(poolDuckDai.contract.address);

    // partially repay debt
    tx = await poolDuckDai.quoteApprove(signerBorrower, constants.MaxUint256);
    await submitAndVerifyTransaction(tx);
    tx = await poolDuckDai.repayDebt(signerBorrower, toWad(100), 0);
    await submitAndVerifyTransaction(tx);
    loan = await poolDuckDai.getLoan(signerBorrower.address);
    expect(loan.debt).toBeBetween(toWad(300), toWad(350));
    expect(await tduck.ownerOf(tokenId)).toEqual(poolDuckDai.contract.address);

    // fully repay debt and pull collateral
    tx = await poolDuckDai.repayDebt(signerBorrower, constants.MaxUint256, 1);
    await submitAndVerifyTransaction(tx);
    stats = await poolDuckDai.getStats();
    expect(stats.poolSize.gte(initialStats.poolSize)).toBe(true);
    expect(stats.debt).toBeBetween(toWad(400), toWad(500));
    loan = await poolDuckDai.getLoan(signerBorrower.address);
    expect(loan.debt).toEqual(toWad(0));
    expect(await tduck.ownerOf(tokenId)).toEqual(signerBorrower.address);
  });
});
