import { Signer } from 'ethers';
import { SdkError } from '../classes/types';
import { Provider, SignerOrProvider } from '../types';

// calculates expiration time based on current block timestamp
export const getExpiry = async (signer: SignerOrProvider, ttlSeconds?: number) => {
  // TODO: Make this a utility method somewhere
  let provider: Provider;
  if (signer instanceof Signer) {
    if (!signer.provider) {
      throw new SdkError('Provider cannot be empty');
    } else {
      provider = signer.provider;
    }
  } else {
    provider = signer;
  }

  // TODO: Make the default timeout configurable in the SDK
  const ttl = ttlSeconds || 600;
  // TODO: Look into whether we can subscribe to block updates and
  // asynchronously maintain the current block height and timestamp.
  const blockNumber = await provider.getBlockNumber();
  return (await provider.getBlock(blockNumber)).timestamp + ttl;
};
