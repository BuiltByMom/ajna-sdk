import { BigNumber, Contract, Signer } from 'ethers';
import {
  getPositionManagerContract,
  isIndexInPosition,
  memorializePositions,
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

    try {
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
          throw new SdkError(`Insufficient LP Balance: ${allowance} < ${lpBalance}}`);
        }
      }

      return memorializePositions(signer, pool.address, this.tokenId, indexes, overrides);
    } catch (error: any) {
      throw new SdkError(error.message, error);
    }
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
    try {
      if (indexes.length === 0) {
        throw new SdkError(`No indexes in position for token id: ${this.tokenId}`);
      }

      for (const index of indexes) {
        await this.isIndexInPosition(index, this.tokenId);
      }

      return await redeemPositions(signer, pool.address, this.tokenId, indexes, overrides);
    } catch (error: any) {
      throw new SdkError(error.message, error);
    }
  }

  // TODO: implement moveLiquidity
}
