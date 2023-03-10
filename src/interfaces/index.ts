import { FungiblePool } from 'classes/fungible-pool';
import {
  Address,
  FactoryDeployPoolParams,
  SignerOrProvider,
  WrappedTransaction,
} from '../constants/interfaces';

export interface IERC20PoolFactory {
  /**
   * Deploys a cloned pool for the given collateral and quote token and returns new pool instance.
   */
  deployPool(params: FactoryDeployPoolParams): Promise<WrappedTransaction>;
  /**
   * Returns pool instance for the given collateral and quote tokens addresses.
   */
  getPool(
    collateralAddress: Address,
    quoteAddress: Address
  ): Promise<FungiblePool>;
  /**
   * Returns pool address for the given collateral and quote tokens addresses.
   */
  getPoolAddress(
    collateralAddress: Address,
    quoteAddress: Address
  ): Promise<Address>;
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
