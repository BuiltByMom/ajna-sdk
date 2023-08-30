import { BigNumber } from 'ethers';
import { MAX_FENWICK_INDEX } from '../constants';
import { getNftContract } from '../contracts/erc721';
import {
  addCollateral,
  approve,
  drawDebt,
  getErc721PoolContract,
  getErc721PoolContractMulti,
  mergeOrRemoveCollateral,
  removeCollateral,
  repayDebt,
} from '../contracts/erc721-pool';
import { Pool } from './Pool';
import { Address, SdkError, Signer, SignerOrProvider } from '../types';
import { getExpiry } from '../utils/time';
import { priceToIndex } from '../utils/pricing';
import { NonfungibleBucket } from './NonfungibleBucket';

class NonfungiblePool extends Pool {
  isSubset: boolean;

  constructor(provider: SignerOrProvider, poolAddress: Address, ajnaAddress: Address) {
    super(
      provider,
      poolAddress,
      ajnaAddress,
      getErc721PoolContract(poolAddress, provider),
      getErc721PoolContractMulti(poolAddress)
    );
    this.isSubset = false;
  }

  async initialize() {
    await super.initialize();
    const collateralToken = getNftContract(this.collateralAddress, this.provider);
    this.collateralSymbol = (await collateralToken.symbol()).replace(/"+/g, '');
    this.name = this.collateralSymbol + '-' + this.quoteSymbol;
    this.isSubset = await this.contract.isSubset();
  }

  toString() {
    return `${this.name} ${this.isSubset ? 'subset' : 'collection'} pool`;
  }

  /**
   * approve this pool to transfer an NFT
   * @param signer pool user
   * @param allowance normalized approval amount (or MaxUint256)
   * @returns promise to transaction
   */
  async collateralApprove(signer: Signer, tokenId: number) {
    return approve(signer, this.poolAddress, this.collateralAddress, tokenId);
  }

  /**
   * deposit one or more NFTs into a bucket (not for borrowers)
   * @param signer address to be awarded LP
   * @param bucketIndex identifies the price bucket
   * @param tokenIdsToAdd identifies NFTs to deposit
   * @param ttlSeconds revert if not processed in this amount of time
   * @returns promise to transaction
   */
  async addCollateral(
    signer: Signer,
    bucketIndex: number,
    tokenIdsToAdd: Array<number>,
    ttlSeconds?: number
  ) {
    const contractPoolWithSigner = this.contract.connect(signer);

    return addCollateral(
      contractPoolWithSigner,
      tokenIdsToAdd,
      bucketIndex,
      await getExpiry(this.provider, ttlSeconds)
    );
  }

  /**
   * Merge collateral accross a number of buckets, `removalIndexes` reconstitute an `NFT`.
   * @param signer address to merge LPB and potentially remove whole NFTs
   * @param removalIndexes Array of bucket indexes to remove all collateral that the caller has ownership over.
   * @param noOfNFTsToRemove Intergral number of `NFT`s to remove if collateral amount is met `noOfNFTsToRemove`, else merge at bucket index, `toIndex`.
   * @param toIndex The bucket index to which merge collateral into.
   * @returns promise to transaction
   */
  async mergeOrRemoveCollateral(
    signer: Signer,
    removalIndexes: Array<number>,
    noOfNFTsToRemove: number,
    toIndex: number
  ) {
    const contractPoolWithSigner = this.contract.connect(signer);

    return mergeOrRemoveCollateral(
      contractPoolWithSigner,
      removalIndexes,
      noOfNFTsToRemove,
      toIndex
    );
  }

  /**
   * withdraw collateral from a bucket (not for borrowers)
   * @param signer address to redeem LP
   * @param bucketIndex identifies the price bucket
   * @param maxAmount optionally limits amount to remove
   * @returns promise to transaction
   */
  async removeCollateral(signer: Signer, bucketIndex: number, noOfNFTsToRemove: number) {
    const contractPoolWithSigner = this.contract.connect(signer);

    return removeCollateral(contractPoolWithSigner, noOfNFTsToRemove, bucketIndex);
  }

  /**
   * pledges collateral and draws debt
   * @param signer borrower
   * @param amountToBorrow new debt to draw
   * @param tokenIdsToPledge identifies NFTs to deposit as collateral
   * @param limitIndex revert if loan would drop LUP below this bucket (or pass MAX_FENWICK_INDEX)
   * @returns promise to transaction
   */
  async drawDebt(
    signer: Signer,
    amountToBorrow: BigNumber,
    tokenIdsToPledge: Array<number>,
    limitIndex?: number
  ) {
    const contractPoolWithSigner = this.contract.connect(signer);
    const borrowerAddress = await signer.getAddress();

    return drawDebt(
      contractPoolWithSigner,
      borrowerAddress,
      amountToBorrow,
      limitIndex ?? MAX_FENWICK_INDEX,
      tokenIdsToPledge
    );
  }

  /**
   * repays debt and pulls collateral
   * @param signer borrower
   * @param maxQuoteTokenAmountToRepay amount for partial repayment, MaxUint256 for full repayment, 0 for no repayment
   * @param noOfNFTsToPull number of NFTs to withdraw after repayment
   * @param limitIndex revert if LUP has moved below this bucket by the time the transaction is processed
   * @returns promise to transaction
   */
  async repayDebt(
    signer: Signer,
    maxQuoteTokenAmountToRepay: BigNumber,
    noOfNFTsToPull: number,
    limitIndex?: number
  ) {
    const contractPoolWithSigner = this.contract.connect(signer);

    const sender = await signer.getAddress();
    return repayDebt(
      contractPoolWithSigner,
      sender,
      maxQuoteTokenAmountToRepay,
      noOfNFTsToPull,
      sender,
      limitIndex ?? MAX_FENWICK_INDEX
    );
  }

  /**
   * @param bucketIndex fenwick index of the desired bucket
   * @returns {@link NonfungibleBucket} modeling bucket at specified index
   */
  getBucketByIndex(bucketIndex: number) {
    const bucket = new NonfungibleBucket(this.provider, this, bucketIndex);
    return bucket;
  }

  /**
   * @param price price within range supported by Ajna
   * @returns {@link NonfungibleBucket} modeling bucket at nearest to specified price
   */
  getBucketByPrice(price: BigNumber) {
    const bucketIndex = priceToIndex(price);
    // priceToIndex should throw upon invalid price
    const bucket = new NonfungibleBucket(this.provider, this, bucketIndex);
    return bucket;
  }

  /**
   * @param minPrice lowest desired price
   * @param maxPrice highest desired price
   * @returns array of {@link NonfungibleBucket}s between specified prices
   */
  getBucketsByPriceRange(minPrice: BigNumber, maxPrice: BigNumber) {
    if (minPrice.gt(maxPrice)) throw new SdkError('maxPrice must exceed minPrice');

    const buckets = new Array<NonfungibleBucket>();
    for (let index = priceToIndex(maxPrice); index <= priceToIndex(minPrice); index++) {
      buckets.push(new NonfungibleBucket(this.provider, this, index));
    }

    return buckets;
  }
}

export { NonfungiblePool };
