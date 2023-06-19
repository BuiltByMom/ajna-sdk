import { Address, SignerOrProvider, TransactionOverrides } from '../types';
import { ContractBase } from './ContractBase';
import { BigNumberish, ContractReceipt, Signer } from 'ethers';
import { PositionManager as PositionManagerContract } from '../types/contracts';
import { getPositionManagerContract } from '../contracts/position-manager';
import { createTransaction, parseNodeError } from '../utils';
import { SdkError } from './types';

/**
 * Factory used to find or create pools with ERC20 collateral.
 */
class PositionManager extends ContractBase {
  contract: PositionManagerContract;
  constructor(signerOrProvider: SignerOrProvider) {
    super(signerOrProvider);
    this.contract = getPositionManagerContract(signerOrProvider);
  }

  async memorializePositions(
    signer: Signer,
    poolAddress: Address,
    tokenId: BigNumberish,
    overrides?: TransactionOverrides
  ): Promise<ContractReceipt> {
    const positionManager = getPositionManagerContract(signer);
    const indexes = await positionManager.getPositionIndexes(tokenId);

    try {
      const wrappedTx = await createTransaction(
        positionManager,
        { methodName: 'memorializePositions', args: [poolAddress, tokenId, indexes] },
        { ...overrides, from: await signer.getAddress() }
      );
      return await wrappedTx.verifyAndSubmit();
    } catch (error: any) {
      throw new SdkError(parseNodeError(error, positionManager), error);
    }
  }

  async redeemPositions(
    signer: Signer,
    poolAddress: Address,
    tokenId: BigNumberish,
    overrides?: TransactionOverrides
  ): Promise<ContractReceipt> {
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
      throw new SdkError(parseNodeError(error, positionManager), error);
    }
  }
}

export { PositionManager };
