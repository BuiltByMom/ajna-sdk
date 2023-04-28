/* Autogenerated file. Do not edit manually. */
/* tslint:disable */
/* eslint-disable */

import { Contract, Signer, utils } from 'ethers';
import type { Provider } from '@ethersproject/providers';
import type { RewardsManager, RewardsManagerInterface } from '../RewardsManager';

const _abi = [
  {
    type: 'constructor',
    payable: false,
    inputs: [
      {
        type: 'address',
        name: 'ajnaToken_',
      },
      {
        type: 'address',
        name: 'positionManager_',
      },
    ],
  },
  {
    type: 'error',
    name: 'AlreadyClaimed',
    inputs: [],
  },
  {
    type: 'error',
    name: 'DeployWithZeroAddress',
    inputs: [],
  },
  {
    type: 'error',
    name: 'EpochNotAvailable',
    inputs: [],
  },
  {
    type: 'error',
    name: 'MoveStakedLiquidityInvalid',
    inputs: [],
  },
  {
    type: 'error',
    name: 'NotOwnerOfDeposit',
    inputs: [],
  },
  {
    type: 'event',
    anonymous: false,
    name: 'ClaimRewards',
    inputs: [
      {
        type: 'address',
        name: 'owner',
        indexed: true,
      },
      {
        type: 'address',
        name: 'ajnaPool',
        indexed: true,
      },
      {
        type: 'uint256',
        name: 'tokenId',
        indexed: true,
      },
      {
        type: 'uint256[]',
        name: 'epochsClaimed',
        indexed: false,
      },
      {
        type: 'uint256',
        name: 'amount',
        indexed: false,
      },
    ],
  },
  {
    type: 'event',
    anonymous: false,
    name: 'MoveStakedLiquidity',
    inputs: [
      {
        type: 'uint256',
        name: 'tokenId',
        indexed: false,
      },
      {
        type: 'uint256[]',
        name: 'fromIndexes',
        indexed: false,
      },
      {
        type: 'uint256[]',
        name: 'toIndexes',
        indexed: false,
      },
    ],
  },
  {
    type: 'event',
    anonymous: false,
    name: 'Stake',
    inputs: [
      {
        type: 'address',
        name: 'owner',
        indexed: true,
      },
      {
        type: 'address',
        name: 'ajnaPool',
        indexed: true,
      },
      {
        type: 'uint256',
        name: 'tokenId',
        indexed: true,
      },
    ],
  },
  {
    type: 'event',
    anonymous: false,
    name: 'Unstake',
    inputs: [
      {
        type: 'address',
        name: 'owner',
        indexed: true,
      },
      {
        type: 'address',
        name: 'ajnaPool',
        indexed: true,
      },
      {
        type: 'uint256',
        name: 'tokenId',
        indexed: true,
      },
    ],
  },
  {
    type: 'event',
    anonymous: false,
    name: 'UpdateExchangeRates',
    inputs: [
      {
        type: 'address',
        name: 'caller',
        indexed: true,
      },
      {
        type: 'address',
        name: 'ajnaPool',
        indexed: true,
      },
      {
        type: 'uint256[]',
        name: 'indexesUpdated',
        indexed: false,
      },
      {
        type: 'uint256',
        name: 'rewardsClaimed',
        indexed: false,
      },
    ],
  },
  {
    type: 'function',
    name: 'ajnaToken',
    constant: true,
    stateMutability: 'view',
    payable: false,
    inputs: [],
    outputs: [
      {
        type: 'address',
      },
    ],
  },
  {
    type: 'function',
    name: 'calculateRewards',
    constant: true,
    stateMutability: 'view',
    payable: false,
    inputs: [
      {
        type: 'uint256',
        name: 'tokenId_',
      },
      {
        type: 'uint256',
        name: 'epochToClaim_',
      },
    ],
    outputs: [
      {
        type: 'uint256',
        name: 'rewards_',
      },
    ],
  },
  {
    type: 'function',
    name: 'claimRewards',
    constant: false,
    payable: false,
    inputs: [
      {
        type: 'uint256',
        name: 'tokenId_',
      },
      {
        type: 'uint256',
        name: 'epochToClaim_',
      },
    ],
    outputs: [],
  },
  {
    type: 'function',
    name: 'getBucketStateStakeInfo',
    constant: true,
    stateMutability: 'view',
    payable: false,
    inputs: [
      {
        type: 'uint256',
        name: 'tokenId_',
      },
      {
        type: 'uint256',
        name: 'bucketId_',
      },
    ],
    outputs: [
      {
        type: 'uint256',
      },
      {
        type: 'uint256',
      },
    ],
  },
  {
    type: 'function',
    name: 'getStakeInfo',
    constant: true,
    stateMutability: 'view',
    payable: false,
    inputs: [
      {
        type: 'uint256',
        name: 'tokenId_',
      },
    ],
    outputs: [
      {
        type: 'address',
      },
      {
        type: 'address',
      },
      {
        type: 'uint256',
      },
    ],
  },
  {
    type: 'function',
    name: 'isEpochClaimed',
    constant: true,
    stateMutability: 'view',
    payable: false,
    inputs: [
      {
        type: 'uint256',
      },
      {
        type: 'uint256',
      },
    ],
    outputs: [
      {
        type: 'bool',
      },
    ],
  },
  {
    type: 'function',
    name: 'moveStakedLiquidity',
    constant: false,
    payable: false,
    inputs: [
      {
        type: 'uint256',
        name: 'tokenId_',
      },
      {
        type: 'uint256[]',
        name: 'fromBuckets_',
      },
      {
        type: 'uint256[]',
        name: 'toBuckets_',
      },
      {
        type: 'uint256',
        name: 'expiry_',
      },
    ],
    outputs: [],
  },
  {
    type: 'function',
    name: 'positionManager',
    constant: true,
    stateMutability: 'view',
    payable: false,
    inputs: [],
    outputs: [
      {
        type: 'address',
      },
    ],
  },
  {
    type: 'function',
    name: 'rewardsClaimed',
    constant: true,
    stateMutability: 'view',
    payable: false,
    inputs: [
      {
        type: 'uint256',
      },
    ],
    outputs: [
      {
        type: 'uint256',
      },
    ],
  },
  {
    type: 'function',
    name: 'stake',
    constant: false,
    payable: false,
    inputs: [
      {
        type: 'uint256',
        name: 'tokenId_',
      },
    ],
    outputs: [],
  },
  {
    type: 'function',
    name: 'unstake',
    constant: false,
    payable: false,
    inputs: [
      {
        type: 'uint256',
        name: 'tokenId_',
      },
    ],
    outputs: [],
  },
  {
    type: 'function',
    name: 'updateBucketExchangeRatesAndClaim',
    constant: false,
    payable: false,
    inputs: [
      {
        type: 'address',
        name: 'pool_',
      },
      {
        type: 'uint256[]',
        name: 'indexes_',
      },
    ],
    outputs: [
      {
        type: 'uint256',
        name: 'updateReward',
      },
    ],
  },
  {
    type: 'function',
    name: 'updateRewardsClaimed',
    constant: true,
    stateMutability: 'view',
    payable: false,
    inputs: [
      {
        type: 'uint256',
      },
    ],
    outputs: [
      {
        type: 'uint256',
      },
    ],
  },
] as const;

export class RewardsManager__factory {
  static readonly abi = _abi;
  static createInterface(): RewardsManagerInterface {
    return new utils.Interface(_abi) as RewardsManagerInterface;
  }
  static connect(address: string, signerOrProvider: Signer | Provider): RewardsManager {
    return new Contract(address, _abi, signerOrProvider) as RewardsManager;
  }
}
