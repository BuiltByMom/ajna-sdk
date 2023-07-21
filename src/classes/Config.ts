import { Address } from '../types';

/**
 * manages static protocol configuration, particularly contract addresses for a single chain
 */

class Config {
  static erc20PoolFactory: Address;
  static erc721PoolFactory: Address;
  static poolUtils: Address;
  static positionManager: Address;
  static ajnaToken: Address;
  static grantFund: Address;

  /**
   * allows consumer to configure with their own addresses
   * @param erc20PoolFactory address of the factory contract which creates fungible pools
   * @param erc721PoolFactory address of the factory contract which creates NFT pools
   * @param poolUtils address of the readonly utility contract
   * @param ajnaToken address of the Ajna token contract
   * @param grantFund address of the Ajna token contract
   */
  constructor(
    erc20PoolFactory: Address,
    erc721PoolFactory: Address,
    poolUtils: Address,
    positionManager: Address,
    ajnaToken: Address,
    grantFund: Address
  ) {
    Config.erc20PoolFactory = erc20PoolFactory;
    Config.erc721PoolFactory = erc721PoolFactory;
    Config.poolUtils = poolUtils;
    Config.positionManager = positionManager;
    Config.ajnaToken = ajnaToken;
    Config.grantFund = grantFund;
  }

  /**
   * configures addresses from known environment variables
   */
  static fromEnvironment(network: 'goerli' | 'mainnet' = 'goerli') {
    return new Config(
      networks[network].ERC20PoolFactory.address,
      networks[network].ERC721PoolFactory.address,
      networks[network].PoolUtils.address,
      networks[network].PositionManager.address,
      networks[network].AjnaToken.address,
      networks[network].GrantFund.address
    );
  }
}

export { Config };
