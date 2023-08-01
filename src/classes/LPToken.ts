import { BigNumber, BigNumberish, Contract, Signer } from 'ethers';
import {
  getPositionManagerContract,
  isIndexInPosition,
  memorializePositions,
  redeemPositions,
  tokenURI,
} from '../contracts/position-manager';
import {
  Address,
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
   * @param pool     Pool to which this bucket belongs.
   * @param index    Price bucket index.
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

  async isIndexInPosition(index: BigNumberish, tokenId: BigNumber = this.tokenId) {
    return await isIndexInPosition(this.provider, tokenId, index);
  }

  async memorializePositions(
    signer: Signer,
    pool: Contract,
    tokenId: BigNumberish,
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

      return memorializePositions(signer, pool.address, tokenId, indexes, overrides);
    } catch (error: any) {
      throw new SdkError(error.message, error);
    }
  }

  async redeemPositions(
    signer: Signer,
    poolAddress: Address,
    tokenId: BigNumber,
    indexes: number[],
    overrides?: TransactionOverrides
  ): Promise<WrappedTransaction> {
    try {
      if (indexes.length === 0) {
        throw new SdkError(`No indexes in position for token id: ${tokenId}`);
      }

      for (const index of indexes) {
        await this.isIndexInPosition(index, tokenId);
      }

      return await redeemPositions(signer, poolAddress, tokenId, indexes, overrides);
    } catch (error: any) {
      throw new SdkError(error.message, error);
    }
  }

  // TODO: implement moveLiquidity
}
