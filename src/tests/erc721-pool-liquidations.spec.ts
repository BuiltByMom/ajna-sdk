import { providers } from 'ethers';
import { expect } from '@jest/globals';
import { AjnaSDK } from '../classes/AjnaSDK';
import { NonfungiblePool } from '../classes/NonfungiblePool';
// import { getErc20Contract } from '../contracts/erc20';
import { getNftContract } from '../contracts/erc721';
import { TEST_CONFIG as config } from './test-constants';
import { submitAndVerifyTransaction } from './test-utils';
import { addAccountFromKey } from '../utils/add-account';
import { revertToSnapshot, takeSnapshot } from '../utils/ganache';
import { toWad } from '../utils/numeric';
// import { indexToPrice } from '../utils/pricing';
// import { getBlockTime } from '../utils/time';

jest.setTimeout(1200000);

const TDUCK_ADDRESS = '0xaf36Ce3FD234ba81A9d4676CD09fC6700f087146';
const TDAI_ADDRESS = '0x4cEDCBb309d1646F3E91FB00c073bB28225262E6';
const DEPLOYER_KEY = '0xd332a346e8211513373b7ddcf94b2b513b934b901258a9465c76d0d9a2b676d8';
const LENDER_KEY = '0xaf12577dbd6c3f4837fe2ad515009f9f71b03ce8ba4a59c78c24fb5f445b6d01';
const BORROWER_KEY = '0x8b4c4ea4246dd9c3404eda8ec30145dbe9c23744876e50b31dc8e9a0d26f0c25';
const BORROWER2_KEY = '0xf456f1fa8e9e7ec4d24f47c0470b7bb6d8807ac5a3a7a1c5e04ef89a25aa4f51';

describe('ERC721 pool liquidations', () => {
  const provider = new providers.JsonRpcProvider(config.ETH_RPC_URL);
  const ajna = new AjnaSDK(provider);
  const signerLender = addAccountFromKey(LENDER_KEY, provider);
  const signerBorrower = addAccountFromKey(BORROWER_KEY, provider);
  const signerBorrower2 = addAccountFromKey(BORROWER2_KEY, provider);
  const signerDeployer = addAccountFromKey(DEPLOYER_KEY, provider);
  const TDUCK = getNftContract(TDUCK_ADDRESS, provider);
  //   const TDAI = getErc20Contract(TDAI_ADDRESS, provider);
  const testTokenIds = [1, 2, 3, 4, 5];
  let poolDuckDai: NonfungiblePool;
  let snapshotId: number;

  const fundAndApproveCollateral = async (
    signer: any,
    pool: NonfungiblePool,
    tokenIds: Array<number>
  ) => {
    for (let i = 0; i < tokenIds.length; i++) {
      const tokenId = tokenIds[i];
      // fund borrower
      const receipt = await TDUCK.connect(signerDeployer).transfer(signer.address, tokenId);
      expect(receipt.transactionHash).not.toBe('');

      // approve
      const tx = await pool.collateralApprove(signer, tokenId);
      await submitAndVerifyTransaction(tx);
    }
  };

  beforeAll(async () => {
    poolDuckDai = await ajna.nonfungiblePoolFactory.getPool(TDUCK_ADDRESS, [], TDAI_ADDRESS);

    // approve
    let tx = await poolDuckDai.quoteApprove(signerLender, toWad(5000));
    await submitAndVerifyTransaction(tx);

    // add 10 quote tokens to 1501 bucket
    const higherBucket = await poolDuckDai.getBucketByIndex(1501);
    let quoteAmount = toWad(90);
    tx = await higherBucket.addQuoteToken(signerLender, quoteAmount);
    await submitAndVerifyTransaction(tx);

    // add 50 quote tokens to 2000 bucket
    const lowerBucket = await poolDuckDai.getBucketByIndex(2000);
    quoteAmount = toWad(500);
    tx = await lowerBucket.addQuoteToken(signerLender, quoteAmount);
    await submitAndVerifyTransaction(tx);

    // fund borrower2
    const receipt = await TDUCK.connect(signerDeployer).transfer(
      signerBorrower2.address,
      toWad('100')
    );
    expect(receipt.transactionHash).not.toBe('');

    // draw debt as borrower2
    const bucketIndex = 2001;
    let amountToBorrow = toWad(500);
    const collateralToPledge = 3;
    let tokenIdsToPledge = testTokenIds.slice(0, collateralToPledge);
    fundAndApproveCollateral(signerBorrower2, poolDuckDai, tokenIdsToPledge);
    tx = await poolDuckDai.drawDebt(signerBorrower2, amountToBorrow, tokenIdsToPledge);
    await submitAndVerifyTransaction(tx);

    // check pool lup index
    const stats = await poolDuckDai.getStats();
    const lupIndex = await poolDuckDai.depositIndex(stats.debt);
    expect(+lupIndex).toBe(bucketIndex);

    // check loan, make sure borrower2 threshold price is higher than lup price
    const bucket = await poolDuckDai.getBucketByIndex(lupIndex);
    const lupPrice = bucket.price;
    const loan = await poolDuckDai.getLoan(await signerBorrower2.getAddress());

    expect(lupPrice).toBeDefined();
    expect(lupPrice && lupPrice.gt(loan.thresholdPrice)).toBeTruthy();

    const isKickable = await poolDuckDai.isKickable(signerBorrower2.address);
    expect(isKickable).toBeFalsy();

    // draw debt as borrower1
    amountToBorrow = toWad(80);
    tokenIdsToPledge = testTokenIds.slice(collateralToPledge - 1);
    fundAndApproveCollateral(signerBorrower, poolDuckDai, tokenIdsToPledge);
    tx = await poolDuckDai.drawDebt(signerBorrower, amountToBorrow, tokenIdsToPledge);
    await submitAndVerifyTransaction(tx);

    snapshotId = await takeSnapshot(provider);
  });

  afterEach(async () => {
    expect(await revertToSnapshot(provider, snapshotId)).toBeTruthy();
    // Re-take snapshot after every test, as same snapshot couldn't be used twice
    snapshotId = await takeSnapshot(provider);
  });

  it('should get multiple loans', async () => {
    const loan1 = await poolDuckDai.getLoan(signerBorrower.address);
    const loan2 = await poolDuckDai.getLoan(signerBorrower2.address);

    const loans = await poolDuckDai.getLoans([signerBorrower.address, signerBorrower2.address]);
    expect(loans.size).toEqual(2);

    const loan1multi = loans.get(signerBorrower.address)!;
    expect(loan1multi.collateralization.eq(loan1.collateralization)).toBe(true);
    expect(loan1multi.debt.eq(loan1.debt)).toBe(true);
    expect(loan1multi.collateral.eq(loan1.collateral)).toBe(true);
    expect(loan1multi.thresholdPrice.eq(loan1.thresholdPrice)).toBe(true);
    expect(loan1multi.neutralPrice.eq(loan1.neutralPrice)).toBe(true);
    expect(loan1multi.liquidationBond.eq(loan1.liquidationBond)).toBe(true);
    expect(loan1multi.isKicked).toBe(loan1.isKicked);

    const loan2multi = loans.get(signerBorrower2.address)!;
    expect(loan2multi.collateralization.eq(loan2.collateralization)).toBe(true);
    expect(loan2multi.debt.eq(loan2.debt)).toBe(true);
    expect(loan2multi.collateral.eq(loan2.collateral)).toBe(true);
    expect(loan2multi.thresholdPrice.eq(loan2.thresholdPrice)).toBe(true);
    expect(loan2multi.neutralPrice.eq(loan2.neutralPrice)).toBe(true);
    expect(loan2multi.liquidationBond.eq(loan2.liquidationBond)).toBe(true);
    expect(loan2multi.isKicked).toBe(loan2.isKicked);
  });
});
