import { getErc721PoolContract, getErc721PoolContractMulti } from 'contracts/erc721-pool';
import { getNftContract } from 'contracts/erc721';
import { Address, SignerOrProvider } from 'types';
import { Pool } from './Pool';

class NonfungiblePool extends Pool {
  constructor(provider: SignerOrProvider, poolAddress: Address, ajnaAddress: Address) {
    super(
      provider,
      poolAddress,
      ajnaAddress,
      getErc721PoolContract(poolAddress, provider),
      getErc721PoolContractMulti(poolAddress)
    );
  }

  async initialize() {
    await super.initialize();
    const collateralToken = getNftContract(this.collateralAddress, this.provider);
    this.collateralSymbol = (await collateralToken.symbol()).replace(/"+/g, '');
    this.name = this.collateralSymbol + '-' + this.quoteSymbol;
  }

  toString() {
    return this.name + ' pool';
  }
}

export { NonfungiblePool };
