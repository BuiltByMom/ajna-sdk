import { Provider } from '../types';
import { FungiblePoolFactory } from './FungiblePoolFactory';
import { GrantsFund } from './GrantsFund';

class AjnaSDK {
  provider: Provider;
  // TODO: SDK should offer both factories, with addresses loaded from configuration, not as args.
  factory: FungiblePoolFactory;
  grants: GrantsFund

  constructor(provider: Provider) {
    this.provider = provider;
    this.factory = new FungiblePoolFactory(provider);
    this.grants = new GrantsFund(provider);
  }
}

export { AjnaSDK };
