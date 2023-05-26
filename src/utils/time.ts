import { SdkError } from '../classes/types';
import { DEFAULT_TTL } from '../constants';
import { Provider, SignerOrProvider } from '../types';
import { Signer } from 'ethers';

// calculates expiration time based on current block timestamp
export const getExpiry = async (signer: SignerOrProvider, ttlSeconds: number = DEFAULT_TTL) => {
  // TODO: Make the default timeout DEFAULT_TTL configurable in the SDK
  // TODO: Look into whether we can subscribe to block updates and
  // asynchronously maintain the current block height and timestamp.
  return (await getBlockTime(signer)) + ttlSeconds;
};

export const getBlock = async (signer: SignerOrProvider): Promise<any> => {
  const provider = getProvider(signer);
  let blockNumber = await provider.getBlockNumber();
  let block = await provider.getBlock(blockNumber);
  // handle inconsistencies for tests using evm_revert and evm_increaseTime
  while (!block) {
    block = await provider.getBlock(--blockNumber);
  }
  return block;
};

export const getBlockTime = async (signer: SignerOrProvider): Promise<number> => {
  const block = await getBlock(signer);
  return block.timestamp;
};

function getProvider(signer: SignerOrProvider): Provider {
  if (!(signer instanceof Signer)) {
    return signer;
  }
  if (signer.provider) {
    return signer.provider;
  }
  throw new SdkError('Provider cannot be empty');
}
