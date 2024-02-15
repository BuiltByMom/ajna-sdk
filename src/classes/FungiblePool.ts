import { BigNumber, Signer, constants, utils } from 'ethers';
import { MAX_FENWICK_INDEX } from '../constants';
import { getErc20Contract, getDSTokenContract } from '../contracts/erc20';
import {
  addCollateral,
  approve,
  collateralScale,
  drawDebt,
  getErc20PoolContract,
  getErc20PoolContractMulti,
  removeCollateral,
  repayDebt,
} from '../contracts/erc20-pool';
import { lenderInfo } from '../contracts/pool';
import { Address, CallData, SdkError, SignerOrProvider } from '../types';
import { wmul } from '../utils/numeric';
import { priceToIndex } from '../utils/pricing';
import { getExpiry } from '../utils/time';
import { FungibleBucket } from './FungibleBucket';
import { Pool } from './Pool';

/**
 * Models a pool with ERC-20 collateral.
 */
export class FungiblePool extends Pool {
  constructor(provider: SignerOrProvider, poolAddress: Address, ajnaAddress: Address) {
    super(
      provider,
      poolAddress,
      ajnaAddress,
      getErc20PoolContract(poolAddress, provider),
      getErc20PoolContractMulti(poolAddress)
    );
  }

  async initialize() {
    await super.initialize();
    try {
      const collateralToken = getErc20Contract(this.collateralAddress, this.provider);
      this.collateralSymbol = (await collateralToken.symbol()).replace(/"+/g, '');
    } catch (e) {
      const collateralToken = getDSTokenContract(this.collateralAddress, this.provider);
      this.collateralSymbol = utils
        .parseBytes32String(await collateralToken.symbol())
        .replace(/"+/g, '');
    }
    this.name = this.collateralSymbol + '-' + this.quoteSymbol;
  }

  toString() {
    return this.name + ' pool';
  }

  /**
   * Approve this pool to manage collateral token.
   * @param signer pool user
   * @param allowance normalized approval amount (or MaxUint256)
   * @returns promise to transaction
   */
  async collateralApprove(signer: Signer, allowance: BigNumber) {
    const denormalizedAllowance = allowance.eq(constants.MaxUint256)
      ? allowance
      : allowance.div(await collateralScale(this.contract));
    return approve(signer, this.poolAddress, this.collateralAddress, denormalizedAllowance);
  }

  /**
   * Pledges collateral and draws debt.
   * @param signer borrower
   * @param amountToBorrow new debt to draw
   * @param collateralToPledge new collateral to deposit
   * @param limitIndex revert if loan would drop LUP below this bucket (or pass MAX_FENWICK_INDEX)
   * @returns promise to transaction
   */
  async drawDebt(
    signer: Signer,
    amountToBorrow: BigNumber,
    collateralToPledge: BigNumber,
    limitIndex?: number
  ) {
    const contractPoolWithSigner = this.contract.connect(signer);
    const borrowerAddress = await signer.getAddress();

    return drawDebt(
      contractPoolWithSigner,
      borrowerAddress,
      amountToBorrow,
      limitIndex ?? MAX_FENWICK_INDEX,
      collateralToPledge
    );
  }

  /**
   * Repays debt and pulls collateral.
   * @param signer borrower
   * @param maxQuoteTokenAmountToRepay amount for partial repayment, MaxUint256 for full repayment, 0 for no repayment
   * @param collateralAmountToPull amount of collateral to withdraw after repayment
   * @param limitIndex revert if LUP has moved below this bucket by the time the transaction is processed
   * @returns promise to transaction
   */
  async repayDebt(
    signer: Signer,
    maxQuoteTokenAmountToRepay: BigNumber,
    collateralAmountToPull: BigNumber,
    limitIndex?: number
  ) {
    const contractPoolWithSigner = this.contract.connect(signer);

    const sender = await signer.getAddress();
    return repayDebt(
      contractPoolWithSigner,
      sender,
      maxQuoteTokenAmountToRepay,
      collateralAmountToPull,
      sender,
      limitIndex ?? MAX_FENWICK_INDEX
    );
  }

  /**
   * Deposit collateral token into a bucket (not for borrowers).
   * @param signer address to be awarded LP
   * @param collateralAmountToAdd deposit amount
   * @param bucketIndex identifies the price bucket
   * @param ttlSeconds revert if not processed in this amount of time
   * @returns promise to transaction
   */
  async addCollateral(
    signer: Signer,
    bucketIndex: number,
    collateralAmountToAdd: BigNumber,
    ttlSeconds?: number
  ) {
    const contractPoolWithSigner = this.contract.connect(signer);

    return addCollateral(
      contractPoolWithSigner,
      collateralAmountToAdd,
      bucketIndex,
      await getExpiry(this.provider, ttlSeconds)
    );
  }

  /**
   * Withdraw collateral from a bucket (not for borrowers).
   * @param signer address to redeem LP
   * @param bucketIndex identifies the price bucket
   * @param maxAmount optionally limits amount to remove
   * @returns promise to transaction
   */
  async removeCollateral(
    signer: Signer,
    bucketIndex: number,
    maxAmount: BigNumber = constants.MaxUint256
  ) {
    const contractPoolWithSigner = this.contract.connect(signer);

    return removeCollateral(contractPoolWithSigner, bucketIndex, maxAmount);
  }

  /**
   * @param bucketIndex fenwick index of the desired bucket
   * @returns {@link FungibleBucket} modeling bucket at specified index
   */
  getBucketByIndex(bucketIndex: number) {
    const bucket = new FungibleBucket(this.provider, this, bucketIndex);
    return bucket;
  }

  /**
   * @param price price within range supported by Ajna
   * @returns {@link FungibleBucket} modeling bucket at nearest to specified price
   */
  getBucketByPrice(price: BigNumber) {
    const bucketIndex = priceToIndex(price);
    // priceToIndex should throw upon invalid price
    const bucket = new FungibleBucket(this.provider, this, bucketIndex);
    return bucket;
  }

  /**
   * @param minPrice lowest desired price
   * @param maxPrice highest desired price
   * @returns array of {@link FungibleBucket}s between specified prices
   */
  getBucketsByPriceRange(minPrice: BigNumber, maxPrice: BigNumber) {
    if (minPrice.gt(maxPrice)) throw new SdkError('maxPrice must exceed minPrice');

    const buckets = new Array<FungibleBucket>();
    for (let index = priceToIndex(maxPrice); index <= priceToIndex(minPrice); index++) {
      buckets.push(new FungibleBucket(this.provider, this, index));
    }

    return buckets;
  }

  /**
   * Withdraw all available liquidity from the given buckets using multicall transaction (first quote token, then - collateral if LP is left).
   * @param signer address to redeem LP
   * @param bucketIndices array of bucket indices to withdraw liquidity from
   * @returns promise to transaction
   */
  async withdrawLiquidity(signer: Signer, bucketIndices: Array<number>) {
    const signerAddress = await signer.getAddress();
    const callData: Array<CallData> = [];

    // get buckets
    const bucketPromises = bucketIndices.map(bucketIndex => this.getBucketByIndex(bucketIndex));
    const buckets = await Promise.all(bucketPromises);

    // get bucket details
    const bucketStatusPromises = buckets.map(bucket => bucket.getStatus());
    const bucketStatuses = await Promise.all(bucketStatusPromises);

    // determine lender's LP balance
    const lpBalancePromises = bucketIndices.map(bucketIndex =>
      lenderInfo(this.contract, signerAddress, bucketIndex)
    );
    const lpBalances = await Promise.all(lpBalancePromises);

    for (let i = 0; i < bucketIndices.length; ++i) {
      const [lpBalance] = lpBalances[i];
      const bucketStatus = bucketStatuses[i];
      const bucketIndex = bucketIndices[i];

      // if there is any quote token in the bucket, redeem LP for deposit first
      if (lpBalance && bucketStatus.deposit.gt(0)) {
        callData.push({
          methodName: 'removeQuoteToken',
          args: [constants.MaxUint256, bucketIndex],
        });
      }

      const depositWithdrawnEstimate = wmul(lpBalance, bucketStatus.exchangeRate);

      // CAUTION: This estimate may cause revert because we cannot predict exchange rate for an
      // arbitrary future block where the TX will be processed.
      const withdrawCollateral =
        (bucketStatus.deposit.eq(0) || depositWithdrawnEstimate.gt(bucketStatus.deposit)) &&
        bucketStatus.collateral.gt(0);

      if (withdrawCollateral) {
        callData.push({
          methodName: 'removeCollateral',
          args: [constants.MaxUint256, bucketIndex],
        });
      }
    }

    return this.multicall(signer, callData);
  }
}
