import { AjnaSDK } from '../src/classes/ajna';
import { FungiblePool } from '../src/classes/fungible-pool';
import { Address } from '../src/types';
import { addAccountFromKeystore } from '../src/utils/add-account';
import { toWad } from '../src/utils/numeric';
import { priceToIndex } from '../src/utils/pricing';
import { constants, providers } from 'ethers';

// Configure from environment
const provider = new providers.JsonRpcProvider(process.env.ETH_RPC_URL);
// Use this for local testnets, where JSON keystores are unavailable.
// const signerLender = addAccountFromKey(process.env.ETH_KEY || '', provider);
// Use this for a real chain, such as Goerli or Mainnet.
const signerLender = addAccountFromKeystore(
  process.env.ETH_KEYSTORE || '',
  provider
);
if (signerLender == null) throw new Error('wallet not unlocked');

const ajna = new AjnaSDK(provider);
const wethAddress = process.env.WETH_TOKEN || '0x0';
const daiAddress = process.env.DAI_TOKEN || '0x0';
let pool: FungiblePool;

// Looks for pool, deploying it if it doesn't already exist
const getPool = async () => {
  pool = await ajna.factory.getPool(wethAddress, daiAddress);
  if (pool.poolAddress == constants.AddressZero) {
    pool = await deployPool(wethAddress, daiAddress);
    console.log('Deployed pool to ', pool.poolAddress);
  } else {
    console.log('Using pool with address ', pool.poolAddress);
  }
  return pool;
};

const deployPool = async (collateral: Address, quote: Address) => {
  const tx = await ajna.factory.deployPool({
    signer: signerLender,
    collateralAddress: collateral,
    quoteAddress: quote,
    interestRate: toWad('0.05'),
  });
  await tx.verifyAndSubmit();
  return await ajna.factory.getPool(wethAddress, daiAddress);
};

// Using fine-grained approval, add liquidity to the pool
const addLiquidity = async (amount: string, price: string) => {
  // TODO: approve and add in a multicall
  let tx = await pool.quoteApprove({
    signer: signerLender,
    allowance: toWad(amount),
  });
  await tx.verifyAndSubmit();

  tx = await pool.addQuoteToken({
    signer: signerLender,
    amount: toWad(amount),
    bucketIndex: priceToIndex(toWad(price)),
    ttlSeconds: null,
  });
  await tx.verifyAndSubmit();
};

const removeLiquidity = async (amount: string, price: string) => {
  const tx = await pool.removeQuoteToken({
    signer: signerLender,
    maxAmount: toWad(amount),
    bucketIndex: priceToIndex(toWad(price)),
  });
  console.log(tx);
};

export const run = async () => {
  const pool = await getPool();
  // create existing pool to test exception handling
  // pool = await deployPool(wethAddress, daiAddress);
  console.log(await pool.getStats());
  // add 1000 DAI pricing ETH at 2007.0213
  // await addLiquidity('1000', '2007.0213');
  // await removeLiquidity('10.1', '103.04');
};

run();
