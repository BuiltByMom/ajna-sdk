import { Provider } from '../types';
import { FungiblePoolFactory } from './FungiblePoolFactory';
import { GrantFund } from './GrantFund';
import { NonfungiblePoolFactory } from './NonfungiblePoolFactory';

class AjnaSDK {
  provider: Provider;
  fungiblePoolFactory: FungiblePoolFactory;
  nonfungiblePoolFactory: NonfungiblePoolFactory;
  grants: GrantFund;

  constructor(provider: Provider) {
    this.provider = provider;
    this.fungiblePoolFactory = new FungiblePoolFactory(provider);
    this.nonfungiblePoolFactory = new NonfungiblePoolFactory(provider);
    this.grants = new GrantFund(provider);
  }
}

export { AjnaSDK };
