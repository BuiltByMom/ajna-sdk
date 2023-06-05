import {
  ERC20,
  ERC20Pool,
  ERC20__factory,
  ERC20PoolFactory,
  ERC721,
  ERC721Pool,
  ERC721__factory,
  ERC721PoolFactory,
  PoolInfoUtils,
  PoolInfoUtils__factory,
  PositionManager,
  PositionManager__factory,
  RewardsManager,
  RewardsManager__factory,
  ERC20PoolFactory__factory,
  ERC721PoolFactory__factory,
} from './contracts';
import { ERC20Interface } from './contracts/ERC20';
import { ERC20PoolInterface } from './contracts/ERC20Pool';
import { ERC721Interface } from './contracts/ERC721';
import { ERC721PoolInterface } from './contracts/ERC721Pool';
import { PoolInfoUtilsInterface } from './contracts/PoolInfoUtils';
import { PositionManagerInterface } from './contracts/PositionManager';
import { RewardsManagerInterface } from './contracts/RewardsManager';

export type TOKEN_CONTRACT = ERC20 | ERC721;
export type TOKEN_FACTORY_CONTRACT = ERC20__factory | ERC721__factory;
export type TOKEN_POOL_CONTRACT = ERC20Pool | ERC721Pool;
export type POOL_CONTRACT = TOKEN_POOL_CONTRACT | PoolInfoUtils;
export type POOL_FACTORY_CONTRACT = ERC20PoolFactory | ERC721PoolFactory | PoolInfoUtils__factory;

export type TOKEN_CONTRACTS = TOKEN_CONTRACT | POOL_FACTORY_CONTRACT;
export type POOL_CONTRACTS = POOL_CONTRACT | POOL_FACTORY_CONTRACT;

export type FACTORY_CONTRACTS =
  | POOL_FACTORY_CONTRACT
  | TOKEN_FACTORY_CONTRACT
  | ERC20PoolFactory__factory
  | ERC721PoolFactory__factory
  | PoolInfoUtils__factory
  | PositionManager__factory
  | RewardsManager__factory;
export type OTHER_CONTRACTS = PositionManager | RewardsManager;

export type AJNA_CONTRACTS = TOKEN_CONTRACTS | POOL_CONTRACTS | FACTORY_CONTRACTS | OTHER_CONTRACTS;

export type TOKEN_CONTRACT_IFACE = ERC20Interface | ERC721Interface;
export type POOL_CONTRACT_IFACE = ERC20PoolInterface | ERC721PoolInterface;

export type OTHER_CONTRACTS_IFACES = PositionManagerInterface | RewardsManagerInterface;
export type TOKEN_POOL_CONTRACT_IFACE =
  | TOKEN_CONTRACT_IFACE
  | POOL_CONTRACT_IFACE
  | PoolInfoUtilsInterface;

export type ALL_IFACES = TOKEN_POOL_CONTRACT_IFACE | OTHER_CONTRACTS_IFACES;
