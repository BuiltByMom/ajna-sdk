import erc20PoolJsonAbiJson from './abis/ERC20Pool.json';
import metaMaskPkg from './connectors/meta-mask';

export const erc20PoolJsonAbi = erc20PoolJsonAbiJson;

export const metaMask = metaMaskPkg;

export const metaMaskEnable = metaMaskPkg?.enable;
