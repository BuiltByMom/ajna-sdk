import { BigNumber, constants } from 'ethers';
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
import { Address, CallData, SdkError, Signer, SignerOrProvider } from '../types';
import { getExpiry } from '../utils/time';
import { priceToIndex } from '../utils/pricing';
import { NonfungibleBucket } from './NonfungibleBucket';
import { lenderInfo } from '../contracts/pool';
import { toWad, wadToIntRoundingDown, wmul } from '../utils/numeric';

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
  async collateralApprove(signer: Signer, tokenIds: Array<number>) {
    return approve(signer, this.poolAddress, this.collateralAddress, tokenIds);
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

  async totalBorrowerTokens(borrower: Address): Promise<number> {
    const contractPool = this.contract.connect(this.provider);
    return await contractPool.totalBorrowerTokens(borrower);
  }

  async totalBucketTokens(borrower: Address): Promise<number> {
    const contractPool = this.contract.connect(this.provider);
    return await contractPool.totalBucketTokens(borrower);
  }

  /**
   * withdraw all available liquidity from the given buckets using multicall transaction (first quote token, then - collateral if LP is left)
   * @param signer address to redeem LP
   * @param bucketIndices array of bucket indices to withdraw liquidity from
   * @returns promise to transaction
   */
  async withdrawLiquidity(signer: Signer, bucketIndices: Array<number>) {
    const signerAddress = await signer.getAddress();
    const callData: Array<CallData> = [];

    // sort bucketIndices in ascending index order (descendingPrice) for use in mergeOrRemoveCollateral
    const sortedBucketIndexes = bucketIndices.sort((a, b) => a - b);

    // get buckets
    const bucketPromises = sortedBucketIndexes.map(bucketIndex =>
      this.getBucketByIndex(bucketIndex)
    );
    const buckets = await Promise.all(bucketPromises);

    // get bucket details
    const bucketStatusPromises = buckets.map(bucket => bucket.getStatus());
    const bucketStatuses = await Promise.all(bucketStatusPromises);

    // determine lender's LP balance
    const lpBalancePromises = sortedBucketIndexes.map(bucketIndex =>
      lenderInfo(this.contract, signerAddress, bucketIndex)
    );
    const lpBalances = await Promise.all(lpBalancePromises);

    let surplusCollateral: BigNumber = BigNumber.from(0);
    const surplusIndexes: Array<number> = [];

    for (let i = 0; i < sortedBucketIndexes.length; ++i) {
      const [lpBalance] = lpBalances[i];
      const bucketStatus = bucketStatuses[i];
      const bucketIndex = sortedBucketIndexes[i];

      // if there is any quote token in the bucket, redeem LP for deposit first
      if (lpBalance && bucketStatus.deposit.gt(0)) {
        callData.push({
          methodName: 'removeQuoteToken',
          args: [constants.MaxUint256, bucketIndex],
        });
      }

      const depositWithdrawnEstimate = wmul(lpBalance, bucketStatus.exchangeRate);

      // TODO: add slippage param to increase tx success likelihood?
      // CAUTION: This estimate may cause revert because we cannot predict exchange rate for an
      // arbitrary future block where the TX will be processed.
      const withdrawCollateral =
        (bucketStatus.deposit.eq(0) || depositWithdrawnEstimate.gt(bucketStatus.deposit)) &&
        bucketStatus.collateral.gt(0);

      // attempt to remove collateral if there is an integer number of NFTs available for claiming
      if (withdrawCollateral) {
        // TODO: track the surplus tokens after
        const tokensToRemove = wadToIntRoundingDown(bucketStatus.collateral);

        if (tokensToRemove > 0) {
          callData.push({
            methodName: 'removeCollateral',
            args: [tokensToRemove, bucketIndex],
          });

          // track any surplus collateral in the bucket after removal to be used for mergeOrRemoveCollateral
          const postRemoveSurplus = bucketStatus.collateral.sub(toWad(tokensToRemove));
          if (postRemoveSurplus.gt(0)) {
            surplusCollateral = surplusCollateral.add(postRemoveSurplus);
            surplusIndexes.push(bucketIndex);
          }
        } else {
          // track any surplus collateral associated with the lender and bucket to be used for mergeOrRemoveCollateral
          surplusCollateral = surplusCollateral.add(bucketStatus.collateral);
          surplusIndexes.push(bucketIndex);
        }
      }
    }

    // if there was enough surplus collateral across the lender's buckets, call mergeOrRemoveCollateral on the surplus
    if (surplusCollateral.gt(1)) {
      const mergeOrRemoveToIndex = surplusIndexes[surplusIndexes.length - 1];
      const tokensToRemove = wadToIntRoundingDown(surplusCollateral);
      callData.push({
        methodName: 'mergeOrRemoveCollateral',
        args: [surplusIndexes, tokensToRemove, mergeOrRemoveToIndex],
      });
    }

    return this.multicall(signer, callData);
  }
}

export { NonfungiblePool };
