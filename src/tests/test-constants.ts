import { Config } from '../classes/Config';

export const TEST_CONFIG = {
  ETH_RPC_URL: 'http://0.0.0.0:8555',
  DEPLOYER: '0xeeDC2EE00730314b7d7ddBf7d19e81FB7E5176CA',
  DEPLOYER_KEY: '0xd332a346e8211513373b7ddcf94b2b513b934b901258a9465c76d0d9a2b676d8',
};

// here just to name the parameters
const erc20PoolFactoryAddress = '0x603066511bCe10Fe9c494bF20AEE64e0B9DF7943';
const erc721PoolFactoryAddress = '0x8815C3349E5aE77F851E986b02eBC68613428030';
const poolUtilsAddress = '0xBd4EBd9aA954FadCE1EA3C2Bf16C9AEf334fac44';
const positionManagerAddress = '0x60205851A054184Fe0c51543d401bAfd2239AA1E';
const ajnaTokenAddress = '0x3d96b9997E302a91bC946D31Ea80A228b1548543';
const grantFundAddress = '0xBE5902a0c6CCf915e69332c3386A789739829506';
const burnWrapperAddress = '0x4306638A0F6BD9C4A1EF9EbCFF8579688C9C16Ea';

export const testnetAddresses = new Config(
  erc20PoolFactoryAddress,
  erc721PoolFactoryAddress,
  poolUtilsAddress,
  positionManagerAddress,
  ajnaTokenAddress,
  grantFundAddress,
  burnWrapperAddress
);
