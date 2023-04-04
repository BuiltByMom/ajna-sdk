import { SdkError } from '../classes/types';
import { DEFAULT_TTL } from '../constants';
import { Provider, SignerOrProvider } from '../types';
import { Signer } from 'ethers';

// calculates expiration time based on current block timestamp
export const getExpiry = async (signer: SignerOrProvider, ttlSeconds: number = DEFAULT_TTL) => {
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

  // TODO: Make the default timeout DEFAULT_TTL configurable in the SDK
  // TODO: Look into whether we can subscribe to block updates and
  // asynchronously maintain the current block height and timestamp.
  const blockNumber = await provider.getBlockNumber();
  return (await provider.getBlock(blockNumber)).timestamp + ttlSeconds;
};
