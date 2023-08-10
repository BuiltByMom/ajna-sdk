import { Provider } from '../types';
import { FungiblePoolFactory } from './FungiblePoolFactory';
import { GrantFund } from './GrantFund';
import { NonfungiblePoolFactory } from './NonfungiblePoolFactory';
import { BurnWrapper } from './BurnWrapper';

class AjnaSDK {
  provider: Provider;
  fungiblePoolFactory: FungiblePoolFactory;
  nonfungiblePoolFactory: NonfungiblePoolFactory;
  grants: GrantFund;
  burnWrapper: BurnWrapper;

  constructor(provider: Provider) {
    this.provider = provider;
    this.fungiblePoolFactory = new FungiblePoolFactory(provider);
    this.nonfungiblePoolFactory = new NonfungiblePoolFactory(provider);
    this.grants = new GrantFund(provider);
    this.burnWrapper = new BurnWrapper(provider);
  }
}

export { AjnaSDK };
