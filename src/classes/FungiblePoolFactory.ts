import { BigNumber, constants, Signer } from 'ethers';
import { Config } from '../classes/Config';
import { ERC20_NON_SUBSET_HASH } from '../constants';
import { deployedPools, deployPool } from '../contracts/erc20-pool-factory';
import { Address, IERC20PoolFactory, SdkError, SignerOrProvider } from '../types';
import { ContractBase } from './ContractBase';
import { FungiblePool } from './FungiblePool';

/**
 * Factory used to find or create pools with ERC20 collateral.
 */
export class FungiblePoolFactory extends ContractBase implements IERC20PoolFactory {
  constructor(signerOrProvider: SignerOrProvider) {
    super(signerOrProvider);
  }

  /**
   * Creates a new pool.
   * @param signer pool creator
   * @param collateralAddress address of the ERC20 collateral token
   * @param quoteAddress address of the ERC20 quote token
   * @param interestRate initial interest rate, between 1%-10%, as WAD
   * @returns promise to transaction
   */
  async deployPool(
    signer: Signer,
    collateralAddress: Address,
    quoteAddress: Address,
    interestRate: BigNumber
  ) {
    return deployPool(signer, collateralAddress, quoteAddress, interestRate);
  }

  /**
   * Returns existing pool for two tokens.
   * @param collateralAddress token address
   * @param quoteAddress token address
   * @returns {@link FungiblePool} modeling desired pool
   */
  async getPool(collateralAddress: Address, quoteAddress: Address) {
    const poolAddress = await this.getPoolAddress(collateralAddress, quoteAddress);

    if (poolAddress === constants.AddressZero)
      throw new SdkError('Pool for specified tokens was not found');

    return await this.getPoolByAddress(poolAddress);
  }

  /**
   * Returns existing pool.
   * @param poolAddress address of pool
   * @returns {@link FungiblePool} modeling desired pool
   */
  async getPoolByAddress(poolAddress: Address) {
    const newPool = new FungiblePool(this.getProvider(), poolAddress, Config.ajnaToken);
    await newPool.initialize();
    return newPool;
  }

  /**
   * Finds address of an existing pool for two tokens.
   * @param collateralAddress token address
   * @param quoteAddress token address
   * @returns address of the existing pool
   */
  async getPoolAddress(collateralAddress: Address, quoteAddress: Address) {
    return await deployedPools(
      this.getProvider(),
      collateralAddress,
      quoteAddress,
      ERC20_NON_SUBSET_HASH
    );
  }
}
