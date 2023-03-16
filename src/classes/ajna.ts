import { Provider } from '../types';
import { FungiblePoolFactory } from './factory';

class AjnaSDK {
  provider: Provider;
  // TODO: SDK should offer both factories, with addresses loaded from configuration, not as args.
  factory: FungiblePoolFactory;

  constructor(provider: Provider) {
    this.provider = provider;
    this.factory = new FungiblePoolFactory(provider);
  }
}

export { AjnaSDK };
