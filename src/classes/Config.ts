import dotenv from 'dotenv';
import { Address } from 'types';

dotenv.config();

class Config {
  static erc20PoolFactory: Address;
  static erc721PoolFactory: Address;
  static poolUtils: Address;

  constructor(erc20PoolFactory: Address, erc721PoolFactory: Address, poolUtils: Address) {
    Config.erc20PoolFactory = erc20PoolFactory;
    Config.erc721PoolFactory = erc721PoolFactory;
    Config.poolUtils = poolUtils;
  }

  static fromEnvironment() {
    return new Config(
      process.env.AJNA_CONTRACT_ERC20_POOL_FACTORY || '',
      process.env.AJNA_CONTRACT_ERC721_POOL_FACTORY || '',
      process.env.AJNA_POOL_UTILS || ''
    );
  }
}

export { Config };
