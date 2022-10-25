import erc20PoolJsonAbiJson from './abis/ERC20Pool.json';
import erc20PoolFactoryJsonAbiJson from './abis/ERC20PoolFactory.json';
import metaMaskPkg from './connectors/meta-mask';

export * from './constants/config';

export * from './constants/interfaces';

export * from './utils/get-pool-contract';

export * from './utils/get-pool-factory-contract';

export const erc20PoolJsonAbi = erc20PoolJsonAbiJson;

export const erc20PoolFactoryJsonAbi = erc20PoolFactoryJsonAbiJson;

export const metaMask = metaMaskPkg;

export const metaMaskEnable = metaMaskPkg?.enable;
