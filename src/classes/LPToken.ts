import { BigNumber, BigNumberish, Contract, Signer } from 'ethers';
import { getPositionManagerContract, tokenURI } from '../contracts/position-manager';
import {
  Address,
  PositionManager,
  SdkError,
  SignerOrProvider,
  TransactionOverrides,
} from '../types';
import { createTransaction } from '../utils';
import { FungiblePool } from './FungiblePool';
import { TransactionReceipt } from '@ethersproject/providers';

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
    poolClass: FungiblePool,
    tokenId: BigNumberish,
    overrides?: TransactionOverrides
  ): Promise<TransactionReceipt> {
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

      const wrappedTx = await createTransaction(
        positionManager,
        { methodName: 'memorializePositions', args: [poolContract.address, tokenId, indexes] },
        { ...overrides, from: await signer.getAddress() }
      );
      return await wrappedTx.verifyAndSubmit();
    } catch (error: any) {
      throw new SdkError(error.message, error);
    }
  }

  async redeemPositions(
    signer: Signer,
    poolAddress: Address,
    tokenId: BigNumberish,
    overrides?: TransactionOverrides
  ): Promise<TransactionReceipt> {
    const positionManager = getPositionManagerContract(signer);
    try {
      const indexes = await positionManager.getPositionIndexes(tokenId);
      const wrappedTx = await createTransaction(
        positionManager,
        { methodName: 'redeemPositions', args: [poolAddress, tokenId, indexes] },
        { ...overrides, from: await signer.getAddress() }
      );
      return await wrappedTx.verifyAndSubmit();
    } catch (error: any) {
      throw new SdkError(error.message, error);
    }
  }
}
