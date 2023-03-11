import { utils } from 'ethers';
import {
  Address,
  FactoryDeployPoolParams,
  SignerOrProvider,
  IERC20PoolFactory,
} from '../types';
import { deployedPools, deployPool } from '../contracts/erc20-pool-factory';
import { ContractBase } from './ContractBase';
import { FungiblePool } from './fungible-pool';

/**
 * Factory used to find or create pools with ERC20 collateral.
 */
class FungiblePoolFactory extends ContractBase implements IERC20PoolFactory {
  constructor(signerOrProvider: SignerOrProvider) {
    super(signerOrProvider);
  }

  async deployPool(params: FactoryDeployPoolParams) {
    const { signer, collateralAddress, quoteAddress, interestRate } = params;

    return await deployPool(
      signer,
      collateralAddress,
      quoteAddress,
      interestRate
    );
  }

  async getPool(collateralAddress: Address, quoteAddress: Address) {
    const poolAddress = await this.getPoolAddress(
      collateralAddress,
      quoteAddress
    );

    const newPool = new FungiblePool(
      this.getProvider(),
      poolAddress,
      collateralAddress,
      quoteAddress
    );

    return newPool;
  }

  async getPoolAddress(collateralAddress: Address, quoteAddress: Address) {
    const nonSubsetHash = utils.keccak256(
      utils.toUtf8Bytes('ERC20_NON_SUBSET_HASH')
    );

    return await deployedPools(
      this.getProvider(),
      collateralAddress,
      quoteAddress,
      nonSubsetHash
    );
  }
}

export { FungiblePoolFactory };
