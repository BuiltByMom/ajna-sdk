import { SignerOrProvider } from '../types';
import { FungiblePoolFactory } from './FungiblePoolFactory';

class AjnaSDK {
  provider: SignerOrProvider;
  // TODO: SDK should offer both factories, with addresses loaded from configuration, not as args.
  factory: FungiblePoolFactory;

  constructor(provider: SignerOrProvider) {
    this.provider = provider;
    this.factory = new FungiblePoolFactory(provider);
  }
}

export { AjnaSDK };
