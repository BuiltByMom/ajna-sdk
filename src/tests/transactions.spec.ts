import { addAccountFromKey } from '../utils/add-account';
import { toWad } from '../utils/numeric';
import { TEST_CONFIG as config } from './test-constants';
import { constants, providers } from 'ethers';
import dotenv from 'dotenv';
import { dryRunDeployPool, getTokenPoolContract } from './examples.spec';
import {
  deployPool,
  deployedPools,
  getErc20PoolFactoryContract,
} from '../contracts/erc20-pool-factory';
import { getErc20PoolContract } from '../contracts/erc20-pool';
import { ERC20_NON_SUBSET_HASH } from '../constants';
import { WrappedTransactionClass } from '../utils';

dotenv.config();

jest.setTimeout(1200000);

const WETH_ADDRESS = '0xC208f8196F1E1696b07Ea9407ed0555fdBC37c2e';
const USDC_ADDRESS = '0x4F1EF08f55fBC2eeDdD79Ff820357E8D25e49793';
const DAI_ADDRESS = '0x94f6AAE460917F8B64bdf94453eD34C2a49c4E10';
const LENDER_KEY = '0xf456f1fa8e9e7ec4d24f47c0470b7bb6d8807ac5a3a7a1c5e04ef89a25aa4f51';

describe.only('Transaction Examples tests', () => {
  const provider = new providers.JsonRpcProvider(config.ETH_RPC_URL);
  const signerLender = addAccountFromKey(LENDER_KEY, provider);

  it('dryRunDeployPool: should return the address of a deployed pool when tx is dry-run', async () => {
    const dryRunTxResponse = await dryRunDeployPool(
      signerLender,
      WETH_ADDRESS,
      USDC_ADDRESS,
      toWad('0.05')
    );
    const dryRunTxResponse2 = await dryRunDeployPool(
      signerLender,
      WETH_ADDRESS,
      USDC_ADDRESS,
      toWad('0.06')
    );
    expect(dryRunTxResponse).toBeDefined();
    const pools = await deployedPools(
      signerLender,
      WETH_ADDRESS,
      USDC_ADDRESS,
      ERC20_NON_SUBSET_HASH
    );
    console.log(`pools:`, pools);
    expect(pools[0]).toBe(constants.AddressZero);
  });

  it('should not be able to deploy the same pool twice', async function getEthersErrors() {
    const res1 = await deployPool(signerLender, WETH_ADDRESS, USDC_ADDRESS, toWad('0.05'));
    console.log(`res1:`, res1);

    try {
      const res2 = await deployPool(signerLender, WETH_ADDRESS, USDC_ADDRESS, toWad('0.06'));
      // const wt = new WrappedTransactionClass(res2.receipt, res2.contract, signerLender);
      console.log(`res2:`, res2);
      const pools = await deployedPools(
        signerLender,
        WETH_ADDRESS,
        USDC_ADDRESS,
        ERC20_NON_SUBSET_HASH
      );
      console.log(`pools:`, pools);

      const erc20PoolFactory = getErc20PoolFactoryContract(signerLender);
      const numOfDeployedPools = await erc20PoolFactory.getNumberOfDeployedPools();
      const deployedPoolsResponse = await deployedPools(
        signerLender,
        WETH_ADDRESS,
        USDC_ADDRESS,
        ERC20_NON_SUBSET_HASH
      );
      console.log(`numOfDeployedPools:`, numOfDeployedPools);
      console.log(`deployedPoolsResponse:`, deployedPoolsResponse);

      // const pool = getErc20PoolContract(deployedPoolsResponse[0], signerLender);

      // const stats = await pool.getStats()
      const res3 = await deployPool(signerLender, WETH_ADDRESS, USDC_ADDRESS, toWad('0.05'));

      console.log(`res3:`, res3);
    } catch (error: any) {
      const erc20PoolFactory = getErc20PoolFactoryContract(signerLender);
      // const decoded = erc20PoolFactory?.interface.decodeErrorResult('deployPool', error.data);
      const int = erc20PoolFactory.interface;
      const decoded = int.parseError(error.data);
      console.log(`decoded:`, decoded);

      console.error('ERROR:', error);
      // const err = parseNodeError(error);

      // const errrrr = erc20PoolFactory.getNumberOfDeployedPools();
      // console.log(`errrrr:`, errrrr);

      // console.log(`erc20PoolFactory:`, getErc20PoolFactoryContract);
      // console.log(`decodedErrorResult:`, decodedErrorResult);
    }
  });

  it.skip('validate method should not submit actual transaction; submit should submit actual transaction', async () => {
    // let tx = await ajna.factory.deployPool(signerLender, WETH_ADDRESS, DAI_ADDRESS, toWad('0.05'));
    // ensure verification does not advance the nonce
    // const nonce = await signerLender.getTransactionCount();
    // const responseString = await tx.verify();
    // expect(responseString).toBeDefined();
    // expect(await signerLender.getTransactionCount()).toBe(nonce);
    // // ensure pool does not exist, because transaction was never submitted
    // let pool: Pool;
    // await expect(async () => {
    //   pool = await ajna.factory.getPool(WETH_ADDRESS, DAI_ADDRESS);
    // }).rejects.toThrow('Pool for specified tokens was not found');
    // // submit a transaction to deploy the pool
    // tx = await ajna.factory.deployPool(signerLender, WETH_ADDRESS, DAI_ADDRESS, toWad('0.05'));
    // await tx.submit();
    // // confirm the pool now exists
    // pool = await ajna.factory.getPool(WETH_ADDRESS, DAI_ADDRESS);
    // expect(pool.poolAddress).not.toBe(constants.AddressZero);
    // expect(pool.collateralAddress).toBe(WETH_ADDRESS);
    // expect(pool.quoteAddress).toBe(DAI_ADDRESS);
    // expect(await signerLender.getTransactionCount()).toBe(nonce + 1);
  });
});
