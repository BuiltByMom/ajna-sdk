import { BigNumber, Signer, utils } from 'ethers';
import { deployedPools, deployPool } from '../contracts/erc20-pool-factory';
import { Address, IERC20PoolFactory, SignerOrProvider } from '../types';
import { ContractBase } from './ContractBase';
import { FungiblePool } from './FungiblePool';

/**
 * Factory used to find or create pools with ERC20 collateral.
 */
class FungiblePoolFactory extends ContractBase implements IERC20PoolFactory {
  constructor(signerOrProvider: SignerOrProvider) {
    super(signerOrProvider);
  }

  async deployPool(
    signer: Signer,
    collateralAddress: Address,
    quoteAddress: Address,
    interestRate: BigNumber
  ) {
    return await deployPool(signer, collateralAddress, quoteAddress, interestRate);
  }

  async getPool(collateralAddress: Address, quoteAddress: Address) {
    const poolAddress = await this.getPoolAddress(collateralAddress, quoteAddress);

    const newPool = new FungiblePool(
      this.getProvider(),
      poolAddress,
      collateralAddress,
      quoteAddress
    );

    return newPool;
  }

  async getPoolAddress(collateralAddress: Address, quoteAddress: Address) {
    const nonSubsetHash = utils.keccak256(utils.toUtf8Bytes('ERC20_NON_SUBSET_HASH'));

    return await deployedPools(this.getProvider(), collateralAddress, quoteAddress, nonSubsetHash);
  }
}

export { FungiblePoolFactory };
