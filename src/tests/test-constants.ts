import { Config } from '../classes/Config';

export const TEST_CONFIG = {
  ETH_RPC_URL: 'http://0.0.0.0:8555',
  DEPLOYER: '0xeeDC2EE00730314b7d7ddBf7d19e81FB7E5176CA',
  DEPLOYER_KEY: '0xd332a346e8211513373b7ddcf94b2b513b934b901258a9465c76d0d9a2b676d8',
};

// here just to name the parameters
const erc20PoolFactoryAddress = '0x6C3ff638Ad7D4CA25600b5236CeFcb41B3895F8e';
const erc721PoolFactoryAddress = '0x6fE7DEB17CC00A3d65f3CDf852Bb17DddEddf8E7';
const poolUtilsAddress = '0xab56A77bDFe82b36875e92CE717fE533C1709A9D';
const positionManagerAddress = '0x502dD41556B128C23F8B715dBEEBB73D1F1Feb67';
const ajnaTokenAddress = '0x3c55A1F2Dde70ce9481621c67Eb4F6d1d1CB8dBc';
const burnWrapperAddress = '0x19FCc2FFFc1AB0f56f3e706a76021560F557241d';
const grantFundAddress = '0x6F985d253b1Be2a2c9267A447F74fE44F413F2a6';

export const testnetAddresses = new Config(
  erc20PoolFactoryAddress,
  erc721PoolFactoryAddress,
  poolUtilsAddress,
  positionManagerAddress,
  ajnaTokenAddress,
  grantFundAddress,
  burnWrapperAddress
);
