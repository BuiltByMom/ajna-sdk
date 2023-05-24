import { BigNumber, Contract } from 'ethers';
import { getPositionManagerContract, tokenURI } from '../contracts/position-manager';
import { SignerOrProvider } from '../types';

export class LPToken {
  provider: SignerOrProvider;
  tokenId: BigNumber;
  contractPositionManager: Contract;

  /**
   * @param provider JSON-RPC endpoint.
   * @param pool     Pool to which this bucket belongs.
   * @param index    Price bucket index.
   */
  constructor(provider: SignerOrProvider, tokenId: BigNumber) {
    this.provider = provider;
    this.tokenId = tokenId;
    this.contractPositionManager = getPositionManagerContract(this.provider);
  }

  toString() {
    return 'AJNA LP token ' + this.tokenId;
  }

  async tokenURI() {
    return await tokenURI(this.provider, this.tokenId);
  }
}
