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

// Contracts
export type TOKEN_CONTRACT = ERC20 | ERC721;
export type TOKEN_POOL = ERC20Pool | ERC721Pool;
export type POOL_FACTORY = ERC20PoolFactory | ERC721PoolFactory;
export type POOL_CONTRACT = TOKEN_POOL | POOL_FACTORY;
export type TOKEN_POOL_CONTRACT = TOKEN_CONTRACT | POOL_CONTRACT;

export type MANAGER_CONTRACT = PositionManager | RewardsManager;

export type ALL_CONTRACTS = TOKEN_POOL_CONTRACT | MANAGER_CONTRACT | PoolInfoUtils;

// Interfaces
export type TOKEN_CONTRACT_IFACE = ERC20Interface | ERC721Interface;
export type TOKEN_POOL_IFACE = ERC20PoolInterface | ERC721PoolInterface;
export type POOL_FACTORY_IFACE = ERC20PoolFactoryInterface | ERC721PoolFactoryInterface;
export type POOL_CONTRACT_IFACE = TOKEN_POOL_IFACE | POOL_FACTORY_IFACE;
export type TOKEN_POOL_CONTRACT_IFACE = TOKEN_CONTRACT_IFACE | POOL_FACTORY_IFACE;

export type MANAGER_IFACE = PositionManagerInterface | RewardsManagerInterface;

export type ALL_IFACES = TOKEN_POOL_CONTRACT_IFACE | MANAGER_IFACE | PoolInfoUtilsInterface;
