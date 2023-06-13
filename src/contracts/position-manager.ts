import { BigNumber, Contract, Signer } from 'ethers';
import { Config } from '../classes/Config';
import {
  Address,
  PositionManager__factory,
  SignerOrProvider,
  TransactionOverrides,
} from '../types';
import { createTransaction } from '../utils/transactions';

export const getPositionManagerContract = (provider: SignerOrProvider) => {
  return PositionManager__factory.connect(Config.positionManager, provider);
};

export async function mint(
  signer: Signer,
  recipient: Address,
  pool: Address,
  poolSubsetHash: string, // TODO: convert to bytes32
  overrides?: TransactionOverrides
) {
  const contractInstance = getPositionManagerContract(signer);

  return await createTransaction(
    contractInstance,
    { methodName: 'mint', args: [pool, recipient, poolSubsetHash] },
    overrides
  );
}

export async function burn(
  signer: Signer,
  tokenId: BigNumber,
  pool: Address,
  overrides?: TransactionOverrides
) {
  const contractInstance = getPositionManagerContract(signer);

  return await createTransaction(
    contractInstance,
    { methodName: 'burn', args: [pool, tokenId] },
    overrides
  );
}

export async function tokenURI(provider: SignerOrProvider, tokenId: BigNumber) {
  const contractInstance: Contract = getPositionManagerContract(provider);
  return await contractInstance.tokenURI(tokenId);
}
