import { getErc721PoolContract, getErc721PoolContractMulti } from 'contracts';
import { Address, ERC721Pool, SignerOrProvider } from '../types';
import { Pool } from './Pool';

class NonFungiblePool extends Pool {
  readonly contractName = 'ERC721Pool';
  readonly contract: ERC721Pool;

  constructor(provider: SignerOrProvider, poolAddress: Address, ajnaAddress: Address) {
    super(
      provider,
      poolAddress,
      ajnaAddress,
      getErc721PoolContract(poolAddress, provider),
      getErc721PoolContractMulti(poolAddress)
    );
    this.contract = getErc721PoolContract(poolAddress, provider);
  }
}

export { NonFungiblePool };
