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

export type ERC_CONTRACTS = ERC20 | ERC721;
export type POOLS_CONTRACTS = ERC20Pool | ERC721Pool;
export type POOL_FACTORY_CONTRACTS = ERC20PoolFactory | ERC721PoolFactory;
export type TOKEN_CONTRACTS = ERC_CONTRACTS | POOLS_CONTRACTS;
export type TOKEN_FACTORY_CONTRACTS =
  | TOKEN_CONTRACTS
  | POOL_FACTORY_CONTRACTS
  | ERC20__factory
  | ERC721__factory
  | PoolInfoUtils__factory
  | PositionManager__factory
  | RewardsManager__factory;
export type OTHER_CONTRACTS = PoolInfoUtils | PositionManager | RewardsManager;

export type FACTORY_CONTRACTS = ERC20PoolFactory__factory | ERC721PoolFactory__factory;
export type AJNA_CONTRACTS = OTHER_CONTRACTS | TOKEN_FACTORY_CONTRACTS | FACTORY_CONTRACTS;

export type ERC_CONTRACT_IFACES = ERC20Interface | ERC721Interface;
export type POOLS_CONTRACT_IFACES =
  | ERC20PoolInterface
  | ERC721PoolInterface
  | PoolInfoUtilsInterface;
export type TOKEN_CONTRACT_IFACES = ERC_CONTRACT_IFACES | POOLS_CONTRACT_IFACES;
export type OTHER_CONTRACTS_IFACES = PositionManagerInterface | RewardsManagerInterface;
export type ALL_IFACES = ERC_CONTRACT_IFACES | POOLS_CONTRACT_IFACES | OTHER_CONTRACTS_IFACES;
