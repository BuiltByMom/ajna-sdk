import { Provider } from '../constants/interfaces';
import { Factory } from './factory';

class AjnaSDK {
  provider: Provider;
  factory: Factory;

  constructor(provider: Provider) {
    this.provider = provider;
    this.factory = new Factory(provider);
  }
}

export { AjnaSDK };
