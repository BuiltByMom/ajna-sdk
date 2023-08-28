import { BigNumber } from 'ethers';
import { MAX_FENWICK_INDEX } from '../constants';
import { getNftContract } from '../contracts/erc721';
import {
  addCollateral,
  approve,
  drawDebt,
  getErc721PoolContract,
  getErc721PoolContractMulti,
  removeCollateral,
  repayDebt,
} from '../contracts/erc721-pool';
import { Pool } from './Pool';
import { Address, Signer, SignerOrProvider } from '../types';
import { getExpiry } from '../utils/time';
import { Liquidation } from './Liquidation';

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

  // TODO: move this to base pool class
  /**
   * @param borrowerAddress identifies the loan under liquidation
   * @returns {@link Liquidation} models liquidation of a specific loan
   */
  getLiquidation(borrowerAddress: Address) {
    return new Liquidation(this.provider, this.contract, borrowerAddress);
  }
}

export { NonfungiblePool };
