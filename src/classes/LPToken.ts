import { BigNumber, Contract, Signer } from 'ethers';
import {
  getPositionIndexes,
  getPositionIndexesFiltered,
  getPositionManagerContract,
  isIndexInPosition,
  memorializePositions,
  moveLiquidity,
  poolKey,
  redeemPositions,
  tokenURI,
} from '../contracts/position-manager';
import {
  PositionManager,
  SdkError,
  SignerOrProvider,
  TransactionOverrides,
  WrappedTransaction,
} from '../types';
import { lenderInfo, lpAllowance } from '../contracts/pool';
import { getExpiry } from '../utils/time';

export class LPToken {
  provider: SignerOrProvider;
  tokenId: BigNumber;
  contractPositionManager: PositionManager;

  /**
   * @param provider JSON-RPC endpoint.
   * @param tokenId uniquely identifies this LP token
   */
  constructor(provider: SignerOrProvider, tokenId: BigNumber) {
    this.provider = provider;
    this.tokenId = tokenId;
    this.contractPositionManager = getPositionManagerContract(this.provider);
  }

  toString() {
    return 'AJNA LP token ' + this.tokenId;
  }

  async tokenURI() {
    return await tokenURI(this.provider, this.tokenId);
  }

  async isIndexInPosition(index: number, tokenId: BigNumber = this.tokenId) {
    return await isIndexInPosition(this.provider, tokenId, index);
  }

  async getPositionIndexes() {
    return await getPositionIndexes(this.provider, this.tokenId);
  }

  async getPositionIndexesFiltered() {
    return await getPositionIndexesFiltered(this.provider, this.tokenId);
  }

  async poolKey() {
    return await poolKey(this.provider, this.tokenId);
  }

  /**
   * moves LP balance from one or more buckets into this position NFT
   * @param signer lender
   * @param pool pool in which lender added liquidity
   * @param indexes identifies the buckets which lender wants their LP moved into this position NFT
   * @returns promise to transaction
   */
  async memorializePositions(
    signer: Signer,
    pool: Contract,
    indexes: number[],
    overrides?: TransactionOverrides
  ): Promise<WrappedTransaction> {
    const poolContract = pool.connect(signer);

    for (const index of indexes) {
      const allowance = await lpAllowance(
        poolContract,
        index,
        this.contractPositionManager.address,
        await signer.getAddress()
      );
      const [lpBalance] = await lenderInfo(
        poolContract,
        this.contractPositionManager.address,
        index
      );
      if (allowance.lt(lpBalance)) {
        throw new SdkError(`Insufficient LP Balance: ${allowance} < ${lpBalance}`);
      }
    }

    return memorializePositions(signer, pool.address, this.tokenId, indexes, overrides);
  }

  /**
   * removes LP balance from position NFT, placing back into pool
   * @param signer lender
   * @param pool pool for which this position NFT is holding LP balance for the lender
   * @param indexes identifies the buckets in which lender wants LP balance moved out of this position NFT
   * @returns promise to transaction
   */
  async redeemPositions(
    signer: Signer,
    pool: Contract,
    indexes: number[],
    overrides?: TransactionOverrides
  ): Promise<WrappedTransaction> {
    if (indexes.length === 0) {
      throw new SdkError(`No indexes in position for token id: ${this.tokenId}`);
    }

    for (const index of indexes) {
      if (!(await this.isIndexInPosition(index, this.tokenId))) {
        throw new SdkError(`Index ${index} is not in position for token id: ${this.tokenId}`);
      }
    }

    return await redeemPositions(signer, pool.address, this.tokenId, indexes, overrides);
  }

  /**
   * moves memorialized liquidity to a different bucket, allowing LP token holder to adjust position for market price change
   * @param signer lender
   * @param pool pool in which memorialized liquidity should be moved
   * @param fromIndex existing bucket in which lender's position is memorialized
   * @param toIndex target bucket into which lender wants their liquidity moved
   * @param ttlSeconds revert if not processed in this amount of time
   * @param revertBelowLUP revert if lowest utilized price is above toIndex when processed
   * @returns promise to transaction
   */
  async moveLiquidity(
    signer: Signer,
    pool: Contract,
    fromIndex: number,
    toIndex: number,
    ttlSeconds?: number,
    revertBelowLUP = false,
    overrides?: TransactionOverrides
  ): Promise<WrappedTransaction> {
    return moveLiquidity(
      signer,
      pool.address,
      this.tokenId,
      fromIndex,
      toIndex,
      await getExpiry(this.provider, ttlSeconds),
      revertBelowLUP,
      overrides
    );
  }
}
