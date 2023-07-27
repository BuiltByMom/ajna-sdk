import { getNftContract } from 'contracts/erc721';
import {
  addCollateral,
  approve,
  getErc721PoolContract,
  getErc721PoolContractMulti,
  removeCollateral,
} from 'contracts/erc721-pool';
import { Pool } from './Pool';
import { Address, Signer, SignerOrProvider } from 'types';
import { getExpiry } from '../utils/time';

class NonfungiblePool extends Pool {
  constructor(provider: SignerOrProvider, poolAddress: Address, ajnaAddress: Address) {
    super(
      provider,
      poolAddress,
      ajnaAddress,
      getErc721PoolContract(poolAddress, provider),
      getErc721PoolContractMulti(poolAddress)
    );
  }

  async initialize() {
    await super.initialize();
    const collateralToken = getNftContract(this.collateralAddress, this.provider);
    this.collateralSymbol = (await collateralToken.symbol()).replace(/"+/g, '');
    this.name = this.collateralSymbol + '-' + this.quoteSymbol;
  }

  toString() {
    return this.name + ' pool';
    // TODO: specify whether pool is collection or subset
  }

  /**
   * approve this pool to transfer an NFT
   * @param signer pool user
   * @param allowance normalized approval amount (or MaxUint256)
   * @returns transaction
   */
  async collateralApprove(signer: Signer, tokenId: number) {
    return await approve(signer, this.poolAddress, this.collateralAddress, tokenId);
  }

  /**
   * deposit one or more NFTs into a bucket (not for borrowers)
   * @param signer address to be awarded LP
   * @param bucketIndex identifies the price bucket
   * @param tokenIdsToAdd identifies NFTs to deposit
   * @param ttlSeconds revert if not processed in this amount of time
   * @returns transaction
   */
  async addCollateral(
    signer: Signer,
    bucketIndex: number,
    tokenIdsToAdd: Array<number>,
    ttlSeconds?: number
  ) {
    const contractPoolWithSigner = this.contract.connect(signer);

    return await addCollateral(
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
   * @returns transaction
   */
  async removeCollateral(signer: Signer, bucketIndex: number, noOfNFTsToRemove: number) {
    const contractPoolWithSigner = this.contract.connect(signer);

    return await removeCollateral(contractPoolWithSigner, noOfNFTsToRemove, bucketIndex);
  }
}

export { NonfungiblePool };
