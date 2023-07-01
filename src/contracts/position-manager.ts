import { BigNumber, BigNumberish, BytesLike, Signer } from 'ethers';
import { Config } from '../classes/Config';
import {
  Address,
  PositionManager__factory,
  SignerOrProvider,
  TransactionOverrides,
} from '../types';
import { createTransaction } from '../utils';

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
  return await createTransaction(
    contractInstance,
    { methodName: 'mint', args: [poolAddress, recipient, poolSubsetHash] },
    overrides
  );
}

export async function burn(
  signer: Signer,
  tokenId: BigNumberish,
  poolAddress: Address,
  overrides?: TransactionOverrides
) {
  const contractInstance = getPositionManagerContract(signer);
  return await createTransaction(
    contractInstance,
    { methodName: 'burn', args: [poolAddress, tokenId] },
    overrides
  );
}

export async function tokenURI(provider: SignerOrProvider, tokenId: BigNumber) {
  const contractInstance = getPositionManagerContract(provider);
  return await contractInstance.tokenURI(tokenId);
}

export async function getLP(provider: SignerOrProvider, tokenId: BigNumber, index: BigNumberish) {
  const contractInstance = getPositionManagerContract(provider);
  return await contractInstance.getLP(tokenId, index);
}

export async function isIndexInPosition(
  provider: SignerOrProvider,
  tokenId: BigNumber,
  index: BigNumberish
) {
  const contractInstance = getPositionManagerContract(provider);
  return await contractInstance.isIndexInPosition(tokenId, index);
}

export async function memorializePositions(
  signer: Signer,
  poolAddress: Address,
  tokenId: BigNumberish,
  indexes: number[],
  overrides?: TransactionOverrides
) {
  const contractInstance = getPositionManagerContract(signer);
  return createTransaction(
    contractInstance,
    { methodName: 'memorializePositions', args: [poolAddress, tokenId, indexes] },
    { ...overrides, from: await signer.getAddress() }
  );
}

export async function redeemPositions(
  signer: Signer,
  poolAddress: Address,
  tokenId: BigNumberish,
  indexes: number[],
  overrides?: TransactionOverrides
) {
  const contractInstance = getPositionManagerContract(signer);
  return await createTransaction(
    contractInstance,
    { methodName: 'redeemPositions', args: [poolAddress, tokenId, indexes] },
    { ...overrides, from: await signer.getAddress() }
  );
}
