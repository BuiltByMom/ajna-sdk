import { BigNumber, Signer } from 'ethers';
import { ContractBase } from './ContractBase';
import { deployNFTPool } from '../contracts/erc721-pool-factory';
import { FungiblePool } from './FungiblePool';
import { Address, IERC721PoolFactory, SignerOrProvider, WrappedTransaction } from '../types';

/**
 * Factory used to find or create pools with ERC721 collateral.
 */
export class NonfungiblePoolFactory extends ContractBase implements IERC721PoolFactory {
  constructor(signerOrProvider: SignerOrProvider) {
    super(signerOrProvider);
  }

  async deployCollectionPool(
    signer: Signer,
    nftAddress: Address,
    quoteAddress: Address,
    interestRate: BigNumber
  ): Promise<WrappedTransaction> {
    return await deployNFTPool(signer, nftAddress, [], quoteAddress, interestRate);
  }

  async deploySubsetPool(
    signer: Signer,
    nftAddress: Address,
    subset: Array<number>,
    quoteAddress: Address,
    interestRate: BigNumber
  ): Promise<WrappedTransaction> {
    return await deployNFTPool(signer, nftAddress, subset, quoteAddress, interestRate);
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
