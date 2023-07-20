import { BigNumber, constants, Signer } from 'ethers';
import { deployNFTPool, getDeployedNFTPools } from 'contracts/erc721-pool-factory';
import { Address, IERC721PoolFactory, SdkError, SignerOrProvider, WrappedTransaction } from 'types';
import { Config } from './Config';
import { ContractBase } from './ContractBase';
import { NonfungiblePool } from './NonfungiblePool';

/**
 * Factory used to find or create pools with ERC721 collateral.
 */
export class NonfungiblePoolFactory extends ContractBase implements IERC721PoolFactory {
  constructor(signerOrProvider: SignerOrProvider) {
    super(signerOrProvider);
  }

  deployCollectionPool(
    signer: Signer,
    nftAddress: Address,
    quoteAddress: Address,
    interestRate: BigNumber
  ): Promise<WrappedTransaction> {
    return deployNFTPool(signer, nftAddress, [], quoteAddress, interestRate);
  }

  deploySubsetPool(
    signer: Signer,
    nftAddress: Address,
    subset: Array<number>,
    quoteAddress: Address,
    interestRate: BigNumber
  ): Promise<WrappedTransaction> {
    return deployNFTPool(signer, nftAddress, subset, quoteAddress, interestRate);
  }

  async getPool(
    collateralAddress: string,
    subset: any,
    quoteAddress: string
  ): Promise<NonfungiblePool> {
    const existingPoolAddress = await this.getPoolAddress(collateralAddress, subset, quoteAddress);

    if (existingPoolAddress === constants.AddressZero) {
      throw new SdkError('Pool for specified tokens was not found');
    }

    return await this.getPoolByAddress(existingPoolAddress);
  }

  async getPoolByAddress(poolAddress: Address) {
    const newPool = new NonfungiblePool(this.getProvider(), poolAddress, Config.ajnaToken);
    await newPool.initialize();
    return newPool;
  }

  /**
   * finds address of an existing pool
   * @param collateralAddress token address
   * @param subset identifies tokens in pool
   * @param quoteAddress token address
   * @returns address of the existing pool
   */
  getPoolAddress(collateralAddress: Address, subset: any, quoteAddress: Address): Promise<Address> {
    return getDeployedNFTPools(this.getProvider(), collateralAddress, quoteAddress, subset);
  }
}
