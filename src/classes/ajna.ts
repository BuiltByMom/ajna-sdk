import Web3 from 'web3';
import { Factory } from './factory';

class AjnaSDK {
  web3: Web3;
  factory: Factory;

  constructor(web3: Web3) {
    this.web3 = web3;
    this.factory = new Factory(web3);
  }
}

export { AjnaSDK };
