import { BigNumber, BigNumberish, BytesLike, Signer } from 'ethers';
import { Config } from '../classes/Config';
import {
  Address,
  PositionManager__factory,
  SignerOrProvider,
  TransactionOverrides,
  SdkError,
} from '../types';
import { createTransaction, parseNodeError } from '../utils';

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
  const contractInstance = getPositionManagerContract(signer);
  try {
    return await createTransaction(
      contractInstance,
      { methodName: 'mint', args: [poolAddress, recipient, poolSubsetHash] },
      overrides
    );
  } catch (error: any) {
    throw new SdkError('mint error:', parseNodeError(error, poolAddress));
  }
}

export async function burn(
  signer: Signer,
  tokenId: BigNumberish,
  poolAddress: Address,
  overrides?: TransactionOverrides
) {
  try {
    const contractInstance = getPositionManagerContract(signer);
    return await createTransaction(
      contractInstance,
      { methodName: 'burn', args: [poolAddress, tokenId] },
      overrides
    );
  } catch (error: any) {
    throw new SdkError('burn error:', parseNodeError(error, poolAddress));
  }
}

export async function tokenURI(provider: SignerOrProvider, tokenId: BigNumber) {
  const contractInstance = getPositionManagerContract(provider);
  return await contractInstance.tokenURI(tokenId);
}
