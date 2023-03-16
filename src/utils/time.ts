import { SdkError } from '../classes/types';
import { Provider, SignerOrProvider } from '../types';
import { Signer } from 'ethers';

// calculates expiration time based on current block timestamp
export const getExpiry = async (signer: SignerOrProvider, ttlSeconds: number | null) => {
  // TODO: Make this a utility method somewhere
  let provider: Provider;
  if (signer instanceof Signer) {
    if (signer.provider == null) {
      throw new SdkError('Provider cannot be null');
    } else {
      provider = signer.provider;
    }
  } else {
    provider = signer;
  }

  // TODO: Make the default timeout configurable in the SDK
  const ttl: number = ttlSeconds == null ? 600 : ttlSeconds;
  // TODO: Look into whether we can subscribe to block updates and
  // asynchronously maintain the current block height and timestamp.
  const blockNumber = await provider.getBlockNumber();
  return (await provider.getBlock(blockNumber)).timestamp + ttl;
};
