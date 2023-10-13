import { Address } from '../types';
import { fetchContractAddresses } from '../utils/fetch-contract-addresses';

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
  static burnWrapper: Address;

  /**
   * allows consumer to configure with their own addresses
   * @param erc20PoolFactory address of the factory contract which creates fungible pools
   * @param erc721PoolFactory address of the factory contract which creates NFT pools
   * @param poolUtils address of the readonly utility contract
   * @param ajnaToken address of the AJNA token contract
   * @param grantFund address of the ecosystem coordination contract
   * @param burnWrapper address of the contract used to wrap AJNA for transferring across an L2 bridge
   */
  constructor(
    erc20PoolFactory: Address,
    erc721PoolFactory: Address,
    poolUtils: Address,
    positionManager: Address,
    ajnaToken: Address,
    grantFund: Address,
    burnWrapper: Address
  ) {
    Config.erc20PoolFactory = erc20PoolFactory;
    Config.erc721PoolFactory = erc721PoolFactory;
    Config.poolUtils = poolUtils;
    Config.positionManager = positionManager;
    Config.ajnaToken = ajnaToken;
    Config.grantFund = grantFund;
    Config.burnWrapper = burnWrapper;
  }

  /**
   * configures addresses from known environment variables
   */
  static fromEnvironment() {
    return new Config(
      process.env.AJNA_ERC20_POOL_FACTORY || '',
      process.env.AJNA_ERC721_POOL_FACTORY || '',
      process.env.AJNA_POOL_UTILS || '',
      process.env.AJNA_POSITION_MANAGER || '',
      process.env.AJNA_TOKEN_ADDRESS || '',
      process.env.AJNA_GRANT_FUND || '',
      process.env.AJNA_BURN_WRAPPER || ''
    );
  }

  static async fetchFromIPFS(network: 'mainnet' | 'goerli' | 'polygon') {
    const {
      ERC20_POOL_FACTORY,
      ERC721_POOL_FACTORY,
      POOL_UTILS,
      POSITION_MANAGER,
      AJNA_TOKEN,
      GRANT_FUND,
      BURN_WRAPPER,
    } = await fetchContractAddresses(network);

    return new Config(
      ERC20_POOL_FACTORY,
      ERC721_POOL_FACTORY,
      POOL_UTILS,
      POSITION_MANAGER,
      AJNA_TOKEN,
      GRANT_FUND,
      BURN_WRAPPER
    );
  }
}

export { Config };
