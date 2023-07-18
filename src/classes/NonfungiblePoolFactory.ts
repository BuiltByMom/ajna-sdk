import { BigNumber, Signer } from 'ethers';
import { Address, IERC721PoolFactory, SignerOrProvider, WrappedTransaction } from '../types';
import { ContractBase } from './ContractBase';
import { FungiblePool } from './FungiblePool';

/**
 * Factory used to find or create pools with ERC721 collateral.
 */
export class NonfungiblePoolFactory extends ContractBase implements IERC721PoolFactory {
  constructor(signerOrProvider: SignerOrProvider) {
    super(signerOrProvider);
  }

  deployPool(
    signer: Signer,
    collateralAddress: string,
    subset: any,
    quoteAddress: string,
    interestRate: BigNumber
  ): Promise<WrappedTransaction> {
    throw new Error(
      'Method not implemented.' +
        [signer, collateralAddress, subset, quoteAddress, interestRate].toString()
    );
  }

  getPool(collateralAddress: string, subset: any, quoteAddress: string): Promise<FungiblePool> {
    throw new Error(
      'Method not implemented.' + [collateralAddress, subset, quoteAddress].toString()
    );
  }

  /**
   * finds address of an existing pool
   * @param collateralAddress token address
   * @param subset identifies tokens in pool
   * @param quoteAddress token address
   * @returns address of the existing pool
   */
  async getPoolAddress(
    collateralAddress: Address,
    subset: any,
    quoteAddress: Address
  ): Promise<Address> {
    throw new Error(
      'Method not implemented.' + [collateralAddress, subset, quoteAddress].toString()
    );
  }
}
