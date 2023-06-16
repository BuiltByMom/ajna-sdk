import { BigNumber, PopulatedTransaction } from 'ethers';
import {
  ERC20,
  ERC20Pool,
  ERC20PoolFactory,
  ERC721,
  ERC721Pool,
  ERC721PoolFactory,
  PoolInfoUtils,
  PositionManager,
  RewardsManager,
} from './contracts';

export interface CustomContractTypes {
  estimateGas: {
    [key: string]: (...args: any[]) => Promise<BigNumber>;
  };
  populateTransaction: {
    [key: string]: (...args: any[]) => Promise<PopulatedTransaction>;
  };
  callStatic: {
    [key: string]: (...args: any[]) => Promise<any>;
  };
  functions: {
    [key: string]: (...args: any[]) => Promise<any>;
  };
  contractName: string;
  [key: string]: any;
}

// Contracts
export type TOKEN_CONTRACT = (ERC20 | ERC721) & CustomContractTypes;
export type TOKEN_POOL = (ERC20Pool | ERC721Pool) & CustomContractTypes;
export type POOL_FACTORY = (ERC20PoolFactory | ERC721PoolFactory) & CustomContractTypes;
export type POOL_CONTRACT = TOKEN_POOL | POOL_FACTORY;
export type TOKEN_POOL_CONTRACT = TOKEN_CONTRACT | POOL_CONTRACT;
export type POOL_CONTRACT_AND_UTILS = POOL_FACTORY | (PoolInfoUtils & CustomContractTypes);

export type MANAGER_CONTRACT = (PositionManager | RewardsManager) & CustomContractTypes;

export type ALL_CONTRACTS =
  | TOKEN_POOL_CONTRACT
  | MANAGER_CONTRACT
  | (PoolInfoUtils & CustomContractTypes);
