import { Provider } from '../types';
import { FungiblePoolFactory } from './FungiblePoolFactory';
import { GrantFund } from './GrantFund';
import { PositionManager } from './PositionManager';

class AjnaSDK {
  provider: Provider;
  // TODO: SDK should offer both factories, with addresses loaded from configuration, not as args.
  factory: FungiblePoolFactory;
  grants: GrantFund;
  positionManager: PositionManager;

  constructor(provider: Provider) {
    this.provider = provider;
    this.factory = new FungiblePoolFactory(provider);
    this.grants = new GrantFund(provider);
    this.positionManager = new PositionManager(provider);
  }
}

export { AjnaSDK };
