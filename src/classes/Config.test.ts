import { Config } from './Config';

describe('Config', () => {
  describe('constructor', () => {
    it('should set the correct values', () => {
      const erc20PoolFactory = '0x123';
      const erc721PoolFactory = '0x456';
      const poolUtils = '0x789';
      const positionManager = '0xabc';
      const ajnaToken = '0xdef';
      const grantFund = '0x123abc';
      const burnWrapper = '0x456def';

      const config = new Config(
        erc20PoolFactory,
        erc721PoolFactory,
        poolUtils,
        positionManager,
        ajnaToken,
        grantFund,
        burnWrapper
      );

      expect(config).toEqual({
        erc20PoolFactory,
        erc721PoolFactory,
        poolUtils,
        positionManager,
        ajnaToken,
        grantFund,
        burnWrapper,
      });
    });
  });

  describe('fromEnvironment', () => {
    it('should set the correct values from environment variables', () => {
      process.env.AJNA_ERC20_POOL_FACTORY = '0x123';
      process.env.AJNA_ERC721_POOL_FACTORY = '0x456';
      process.env.AJNA_POOL_UTILS = '0x789';
      process.env.AJNA_POSITION_MANAGER = '0xabc';
      process.env.AJNA_TOKEN_ADDRESS = '0xdef';
      process.env.AJNA_GRANT_FUND = '0x123abc';
      process.env.AJNA_BURN_WRAPPER = '0x456def';

      const config = Config.fromEnvironment();

      expect(config).toEqual({
        erc20PoolFactory: '0x123',
        erc721PoolFactory: '0x456',
        poolUtils: '0x789',
        positionManager: '0xabc',
        ajnaToken: '0xdef',
        grantFund: '0x123abc',
        burnWrapper: '0x456def',
      });
    });
  });

  describe('fetchFromIPFS', () => {
    it('should fetch the correct values from IPFS', async () => {
      const network = 'mainnet';

      jest.spyOn(global, 'fetch').mockResolvedValueOnce({
        json: () => ({
          ERC20_POOL_FACTORY: '0x123',
          ERC721_POOL_FACTORY: '0x456',
          POOL_UTILS: '0x789',
          POSITION_MANAGER: '0xabc',
          AJNA_TOKEN: '0xdef',
          GRANT_FUND: '0x123abc',
          BURN_WRAPPER: '0x456def',
        }),
      } as any);

      const config = await Config.fetchFromIPFS(network);

      expect(config).toEqual({
        erc20PoolFactory: '0x123',
        erc721PoolFactory: '0x456',
        poolUtils: '0x789',
        positionManager: '0xabc',
        ajnaToken: '0xdef',
        grantFund: '0x123abc',
        burnWrapper: '0x456def',
      });
    });
  });
});
