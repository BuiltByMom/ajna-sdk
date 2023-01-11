import metaMaskPkg, {
  metaMaskEnable as metaMaskPkgEnable,
} from './connectors/meta-mask';

export * from './constants/config';
export * from './constants/interfaces';

export * from './contracts/get-generic-contract';
export * from './contracts/get-pool-contract';
export * from './contracts/get-pool-factory-contract';
export * from './contracts/get-nft-contract';
export * from './contracts/get-nft-pool-contract';
export * from './contracts/get-nft-pool-factory-contract';

export { AjnaSDK } from './classes/ajna';

export const connectors = {
  metaMask: metaMaskPkg,
  metaMaskEnable: metaMaskPkgEnable,
};
