import Web3 from 'web3';
import {
  deployPool,
  deployedPools
} from '../contracts/get-pool-factory-contract';
import { Erc20Address, FactoryDeployPoolParams } from 'constants/interfaces';
import { FungiblePool } from './fungible-pool';

class Factory {
  web3: Web3;

  constructor(web3: Web3) {
    this.web3 = web3;
  }

  deployPool = async ({
    collateralAddress,
    quoteAddress,
    userAddress,
    interestRate
  }: FactoryDeployPoolParams) => {
    await deployPool(
      this.web3,
      collateralAddress,
      quoteAddress,
      userAddress,
      interestRate
    );

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
      this.web3,
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
    return await deployedPools(this.web3, collateralAddress, quoteAddress);
  };
}

export { Factory };
