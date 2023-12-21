import { Config } from '../classes/Config';

export const TEST_CONFIG = {
  ETH_RPC_URL: 'http://0.0.0.0:8555',
  DEPLOYER: '0xeeDC2EE00730314b7d7ddBf7d19e81FB7E5176CA',
  DEPLOYER_KEY: '0xd332a346e8211513373b7ddcf94b2b513b934b901258a9465c76d0d9a2b676d8',
};

// here just to name the parameters
const erc20PoolFactoryAddress = '0x9617ABE221F9A9c492D5348be56aef4Db75A692d';
const erc721PoolFactoryAddress = '0x4f05DA51eAAB00e5812c54e370fB95D4C9c51F21';
const poolUtilsAddress = '0x6c5c7fD98415168ada1930d44447790959097482';
const positionManagerAddress = '0xdF7403003a16c49ebA5883bB5890d474794cea5a';
const ajnaTokenAddress = '0x25Af17eF4E2E6A4A2CE586C9D25dF87FD84D4a7d';
const burnWrapperAddress = '0xE340B87CEd1af1AbE1CE8D617c84B7f168e3b18b';
const grantFundAddress = '0x0b3A0ea1Fc7207d3e3ed9973025dA9d0e8fb0F3f';

export const testnetAddresses = new Config(
  erc20PoolFactoryAddress,
  erc721PoolFactoryAddress,
  poolUtilsAddress,
  positionManagerAddress,
  ajnaTokenAddress,
  grantFundAddress,
  burnWrapperAddress
);
