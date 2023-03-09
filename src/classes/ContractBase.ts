import { SignerOrProvider } from '../constants/interfaces';
import { IBaseContract } from '../interfaces';

export class ContractBase implements IBaseContract {
  private provider: SignerOrProvider;

  constructor(signerOrProvider: SignerOrProvider) {
    this.provider = signerOrProvider;
  }

  connect(signerOrProvider: SignerOrProvider) {
    this.provider = signerOrProvider;
    return this;
  }

  getProvider() {
    return this.provider;
  }
}
