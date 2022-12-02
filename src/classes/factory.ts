import {
  Erc20Address,
  FactoryDeployPoolParams,
  SignerOrProvider
} from '../constants/interfaces';
import {
  deployPool,
  deployedPools
} from '../contracts/get-pool-factory-contract';
import { FungiblePool } from './fungible-pool';
import { utils } from 'ethers';

class Factory {
  provider: SignerOrProvider;

  constructor(provider: SignerOrProvider) {
    this.provider = provider;
  }

  deployPool = async ({
    signer,
    collateralAddress,
    quoteAddress,
    interestRate
  }: FactoryDeployPoolParams) => {
    await deployPool(signer, collateralAddress, quoteAddress, interestRate);

    return await this.getPool(collateralAddress, quoteAddress);
  };

  getPool = async (
    collateralAddress: Erc20Address,
    quoteAddress: Erc20Address
  ) => {
    const poolAddress = await this.getPoolAddress(
      collateralAddress,
      quoteAddress
    );

    const newPool = new FungiblePool(
      this.provider,
      poolAddress,
      collateralAddress,
      quoteAddress
    );

    return newPool;
  };

  getPoolAddress = async (
    collateralAddress: Erc20Address,
    quoteAddress: Erc20Address
  ) => {
    const nonSubsetHash = utils.keccak256(
      utils.toUtf8Bytes('ERC20_NON_SUBSET_HASH')
    );

    return await deployedPools(
      this.provider,
      collateralAddress,
      quoteAddress,
      nonSubsetHash
    );
  };
}

export { Factory };
