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
import { ERC20Interface } from './contracts/ERC20';
import { ERC20PoolInterface } from './contracts/ERC20Pool';
import { ERC20PoolFactoryInterface } from './contracts/ERC20PoolFactory';
import { ERC721Interface } from './contracts/ERC721';
import { ERC721PoolInterface } from './contracts/ERC721Pool';
import { ERC721PoolFactoryInterface } from './contracts/ERC721PoolFactory';
import { PoolInfoUtilsInterface } from './contracts/PoolInfoUtils';
import { PositionManagerInterface } from './contracts/PositionManager';
import { RewardsManagerInterface } from './contracts/RewardsManager';

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
