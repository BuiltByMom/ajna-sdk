import { Address, SignerOrProvider, WrappedTransaction } from '../types/core';
import { FungiblePool } from '../classes/FungiblePool';
import { BigNumber, Signer } from 'ethers';

export interface IERC20PoolFactory {
  /**
   * Deploys a cloned pool for the given collateral and quote token and returns new pool instance.
   */
  deployPool(
    signer: Signer,
    collateralAddress: Address,
    quoteAddress: Address,
    interestRate: BigNumber
  ): Promise<WrappedTransaction>;
  /**
   * Returns pool instance for the given collateral and quote tokens addresses.
   */
  getPool(collateralAddress: Address, quoteAddress: Address): Promise<FungiblePool>;
  /**
   * Returns pool address for the given collateral and quote tokens addresses.
   */
  getPoolAddress(collateralAddress: Address, quoteAddress: Address): Promise<Address[]>;
}

export interface IBaseContract {
  /**
   * Updates current contract provider.
   */
  connect(signerOrProvider: SignerOrProvider): IBaseContract;
  /**
   * Returns current contract provider.
   */
  getProvider(): SignerOrProvider;
}

export interface Loan {
  /** collateralization ratio (1e18 = 100%) */
  collateralization: BigNumber;
  /** debt including interest and fees */
  debt: BigNumber;
  /** pledged collateral */
  collateral: BigNumber;
  /** debt divided by collateral */
  thresholdPrice: BigNumber;
  /** kickers penalized if liquidation taken above this price */
  neutralPrice: BigNumber;
  /** estimated bond kicker must post to liquidate */
  liquidationBond: BigNumber;
}
