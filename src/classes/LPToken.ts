import { BigNumber, BigNumberish, Contract, Signer } from 'ethers';
import { getPositionManagerContract, tokenURI } from '../contracts/position-manager';
import {
  Address,
  PositionManager,
  SdkError,
  SignerOrProvider,
  TransactionEventDetails,
  TransactionOverrides,
} from '../types';
import { estimateGasCostAndSendTx } from '../utils';
import { ErcPool } from 'types/typechain';

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

  async lpAllowance(pool: Contract) {
    const allowance = await pool.lpAllowance(
      0,
      this.contractPositionManager.address,
      await pool.signer.getAddress()
    );

    return allowance;
  }

  async memorializePositions(
    signer: Signer,
    poolClass: ErcPool,
    tokenId: BigNumberish,
    overrides?: TransactionOverrides
  ): Promise<TransactionEventDetails> {
    const positionManager = this.contractPositionManager.connect(signer);
    const poolContract = poolClass.contract.connect(signer);

    try {
      const indexes = await positionManager.getPositionIndexes(tokenId);

      indexes.forEach(async index => {
        const inPosition = await positionManager.isIndexInPosition(tokenId, index);
        if (!inPosition) {
          throw new SdkError(`Index ${index} not in position`);
        }
      });

      const lpAllowance = await this.lpAllowance(poolContract);
      const [lpBalance] = await poolContract.lenderInfo(1, await signer.getAddress());

      if (lpAllowance.lt(lpBalance)) {
        throw new SdkError('Insufficient LP allowance');
      }

      return await estimateGasCostAndSendTx(
        positionManager,
        'memorializePositions',
        [poolContract.address, tokenId, indexes],
        { ...overrides, from: await signer.getAddress() }
      );
    } catch (error: any) {
      throw new SdkError(error.message, error);
    }
  }

  async redeemPositions(
    signer: Signer,
    poolAddress: Address,
    tokenId: BigNumberish,
    overrides?: TransactionOverrides
  ): Promise<TransactionEventDetails> {
    const positionManager = getPositionManagerContract(signer);
    try {
      const indexes = await positionManager.getPositionIndexes(tokenId);
      return await estimateGasCostAndSendTx(
        positionManager,
        'redeemPositions',
        [poolAddress, tokenId, indexes],
        { ...overrides, from: await signer.getAddress() }
      );
    } catch (error: any) {
      throw new SdkError(error.message, error);
    }
  }
}
