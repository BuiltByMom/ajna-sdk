import { BigNumber, BigNumberish, BytesLike, Signer } from 'ethers';
import { Config } from '../classes/Config';
import {
  Address,
  PositionManager__factory,
  SignerOrProvider,
  TransactionOverrides,
  SdkError,
} from '../types';
import { estimateGasCostAndSendTx } from '../utils';

export const getPositionManagerContract = (provider: SignerOrProvider) => {
  return PositionManager__factory.connect(Config.positionManager, provider);
};

export async function mint(
  signer: Signer,
  recipient: Address,
  poolAddress: Address,
  poolSubsetHash: BytesLike,
  overrides?: TransactionOverrides
) {
  const positionManager = getPositionManagerContract(signer);
  return await estimateGasCostAndSendTx(
    positionManager,
    'mint',
    [poolAddress, recipient, poolSubsetHash],
    overrides
  );
}

export async function burn(
  signer: Signer,
  tokenId: BigNumberish,
  poolAddress: Address,
  overrides?: TransactionOverrides
) {
  try {
    const contractInstance = getPositionManagerContract(signer);
    return await estimateGasCostAndSendTx(
      contractInstance,
      'burn',
      [poolAddress, tokenId],
      overrides
    );
  } catch (error: any) {
    throw new SdkError('burn error:', error);
  }
}

export async function tokenURI(provider: SignerOrProvider, tokenId: BigNumber) {
  const contractInstance = getPositionManagerContract(provider);
  return await contractInstance.tokenURI(tokenId);
}
