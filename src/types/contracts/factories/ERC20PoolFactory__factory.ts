/* Autogenerated file. Do not edit manually. */
/* tslint:disable */
/* eslint-disable */

import { Contract, Signer, utils } from 'ethers';
import type { Provider } from '@ethersproject/providers';
import type { ERC20PoolFactory, ERC20PoolFactoryInterface } from '../ERC20PoolFactory';

const _abi = [
  {
    type: 'constructor',
    payable: false,
    inputs: [
      {
        type: 'address',
        name: 'ajna_',
      },
    ],
  },
  {
    type: 'error',
    name: 'CreateFail',
    inputs: [],
  },
  {
    type: 'error',
    name: 'DeployQuoteCollateralSameToken',
    inputs: [],
  },
  {
    type: 'error',
    name: 'DeployWithZeroAddress',
    inputs: [],
  },
  {
    type: 'error',
    name: 'PoolAlreadyExists',
    inputs: [],
  },
  {
    type: 'error',
    name: 'PoolInterestRateInvalid',
    inputs: [],
  },
  {
    type: 'event',
    anonymous: false,
    name: 'PoolCreated',
    inputs: [
      {
        type: 'address',
        name: 'pool_',
        indexed: false,
      },
    ],
  },
  {
    type: 'function',
    name: 'ERC20_NON_SUBSET_HASH',
    constant: true,
    stateMutability: 'view',
    payable: false,
    inputs: [],
    outputs: [
      {
        type: 'bytes32',
      },
    ],
  },
  {
    type: 'function',
    name: 'MAX_RATE',
    constant: true,
    stateMutability: 'view',
    payable: false,
    inputs: [],
    outputs: [
      {
        type: 'uint256',
      },
    ],
  },
  {
    type: 'function',
    name: 'MIN_RATE',
    constant: true,
    stateMutability: 'view',
    payable: false,
    inputs: [],
    outputs: [
      {
        type: 'uint256',
      },
    ],
  },
  {
    type: 'function',
    name: 'ajna',
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
    name: 'deployPool',
    constant: false,
    payable: false,
    inputs: [
      {
        type: 'address',
        name: 'collateral_',
      },
      {
        type: 'address',
        name: 'quote_',
      },
      {
        type: 'uint256',
        name: 'interestRate_',
      },
    ],
    outputs: [
      {
        type: 'address',
        name: 'pool_',
      },
    ],
  },
  {
    type: 'function',
    name: 'deployedPools',
    constant: true,
    stateMutability: 'view',
    payable: false,
    inputs: [
      {
        type: 'bytes32',
      },
      {
        type: 'address',
      },
      {
        type: 'address',
      },
    ],
    outputs: [
      {
        type: 'address',
      },
    ],
  },
  {
    type: 'function',
    name: 'deployedPoolsList',
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
        type: 'address',
      },
    ],
  },
  {
    type: 'function',
    name: 'getDeployedPoolsList',
    constant: true,
    stateMutability: 'view',
    payable: false,
    inputs: [],
    outputs: [
      {
        type: 'address[]',
      },
    ],
  },
  {
    type: 'function',
    name: 'getNumberOfDeployedPools',
    constant: true,
    stateMutability: 'view',
    payable: false,
    inputs: [],
    outputs: [
      {
        type: 'uint256',
      },
    ],
  },
  {
    type: 'function',
    name: 'implementation',
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
] as const;

export class ERC20PoolFactory__factory {
  static readonly abi = _abi;
  static createInterface(): ERC20PoolFactoryInterface {
    return new utils.Interface(_abi) as ERC20PoolFactoryInterface;
  }
  static connect(address: string, signerOrProvider: Signer | Provider): ERC20PoolFactory {
    return new Contract(address, _abi, signerOrProvider) as ERC20PoolFactory;
  }
}
