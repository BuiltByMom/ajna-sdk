import { AjnaSDK } from '../src/classes/AjnaSDK';
import { Config } from '../src/classes/Config';
import { FungiblePool } from '../src/classes/FungiblePool';
import { SdkError } from '../src/classes/types';
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
const signerLender = addAccountFromKeystore(process.env.ETH_KEYSTORE || '', provider);
if (!signerLender) throw new SdkError('Wallet not unlocked');

Config.fromEnvironment();
const ajna = new AjnaSDK(provider);
const wethAddress = process.env.WETH_TOKEN || '0x0';
const daiAddress = process.env.DAI_TOKEN || '0x0';
let pool: FungiblePool;

// Looks for pool, deploying it if it doesn't already exist
const getPool = async () => {
  pool = await ajna.factory.getPool(wethAddress, daiAddress);
  if (pool.poolAddress === constants.AddressZero) {
    pool = await deployPool(wethAddress, daiAddress);
    console.log('Deployed pool to ', pool.poolAddress);
  } else {
    console.log('Using pool with address ', pool.poolAddress);
  }
  return pool;
};

const deployPool = async (collateral: Address, quote: Address) => {
  const tx = await ajna.factory.deployPool(signerLender, collateral, quote, toWad('0.05'));
  await tx.verifyAndSubmit();
  return await ajna.factory.getPool(wethAddress, daiAddress);
};

// Using fine-grained approval, add liquidity to the pool
const addLiquidity = async (amount: string, price: string) => {
  let tx = await pool.quoteApprove(signerLender, toWad(amount));
  await tx.verifyAndSubmit();

  tx = await pool.addQuoteToken(signerLender, priceToIndex(toWad(price)), toWad(amount));
  await tx.verifyAndSubmit();
};

// const removeLiquidity = async (amount: string, price: string) => {
//   const tx = await pool.removeQuoteToken(signerLender, priceToIndex(toWad(price)), toWad(amount));
//   await tx.verifyAndSubmit();
// };

export const run = async () => {
  const pool = await getPool();
  // create existing pool to test exception handling
  // pool = await deployPool(wethAddress, daiAddress);
  console.log(await pool.getStats());

  // add 100 DAI pricing ETH at 2007.0213
  await addLiquidity('100', '2007.0213');
  // await removeLiquidity('10.1', '103.04');
};

run();
