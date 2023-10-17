import { Config } from '../classes/Config';

export const TEST_CONFIG = {
  ETH_RPC_URL: 'http://0.0.0.0:8555',
  DEPLOYER: '0xeeDC2EE00730314b7d7ddBf7d19e81FB7E5176CA',
  DEPLOYER_KEY: '0xd332a346e8211513373b7ddcf94b2b513b934b901258a9465c76d0d9a2b676d8',
};

// here just to name the parameters
const erc20PoolFactoryAddress = '0xF05cDdE17A671957f4AA672bcB96329Ef514E114';
const erc721PoolFactoryAddress = '0xE135E89909717DA4fDe24143F509118ceA5fc3f7';
const poolUtilsAddress = '0x19156129c660883435Cad95100D025022443EDb2';
const positionManagerAddress = '0x9a56e5e70373E4965AAAFB994CB58eDC577031D7';
const ajnaTokenAddress = '0x93cDD7D6542E8Db00FFfe7Af39FB3245c3FCb19a';
const burnWrapperAddress = '0xaCBDae8801983605EFC40f48812f7efF797504da';
const grantFundAddress = '0xC01c2D208ebaA1678F14818Db7A698F11cd0B6AB';

export const testnetAddresses = new Config(
  erc20PoolFactoryAddress,
  erc721PoolFactoryAddress,
  poolUtilsAddress,
  positionManagerAddress,
  ajnaTokenAddress,
  grantFundAddress,
  burnWrapperAddress
);
