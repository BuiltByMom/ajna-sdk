/* Autogenerated file. Do not edit manually. */
/* tslint:disable */
/* eslint-disable */

import { Contract, Signer, utils } from 'ethers';
import type { Provider } from '@ethersproject/providers';
import type { ERC20, ERC20Interface } from '../ERC20';

const _abi = [
  {
    type: 'constructor',
    payable: false,
    inputs: [
      {
        type: 'string',
        name: 'name_',
      },
      {
        type: 'string',
        name: 'symbol_',
      },
    ],
  },
  {
    type: 'event',
    anonymous: false,
    name: 'Approval',
    inputs: [
      {
        type: 'address',
        name: 'owner',
        indexed: true,
      },
      {
        type: 'address',
        name: 'spender',
        indexed: true,
      },
      {
        type: 'uint256',
        name: 'value',
        indexed: false,
      },
    ],
  },
  {
    type: 'event',
    anonymous: false,
    name: 'Transfer',
    inputs: [
      {
        type: 'address',
        name: 'from',
        indexed: true,
      },
      {
        type: 'address',
        name: 'to',
        indexed: true,
      },
      {
        type: 'uint256',
        name: 'value',
        indexed: false,
      },
    ],
  },
  {
    type: 'function',
    name: 'allowance',
    constant: true,
    stateMutability: 'view',
    payable: false,
    inputs: [
      {
        type: 'address',
        name: 'owner',
      },
      {
        type: 'address',
        name: 'spender',
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
    name: 'approve',
    constant: false,
    payable: false,
    inputs: [
      {
        type: 'address',
        name: 'spender',
      },
      {
        type: 'uint256',
        name: 'amount',
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
    name: 'balanceOf',
    constant: true,
    stateMutability: 'view',
    payable: false,
    inputs: [
      {
        type: 'address',
        name: 'account',
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
    name: 'decimals',
    constant: true,
    stateMutability: 'view',
    payable: false,
    inputs: [],
    outputs: [
      {
        type: 'uint8',
      },
    ],
  },
  {
    type: 'function',
    name: 'decreaseAllowance',
    constant: false,
    payable: false,
    inputs: [
      {
        type: 'address',
        name: 'spender',
      },
      {
        type: 'uint256',
        name: 'subtractedValue',
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
    name: 'increaseAllowance',
    constant: false,
    payable: false,
    inputs: [
      {
        type: 'address',
        name: 'spender',
      },
      {
        type: 'uint256',
        name: 'addedValue',
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
    name: 'name',
    constant: true,
    stateMutability: 'view',
    payable: false,
    inputs: [],
    outputs: [
      {
        type: 'string',
      },
    ],
  },
  {
    type: 'function',
    name: 'symbol',
    constant: true,
    stateMutability: 'view',
    payable: false,
    inputs: [],
    outputs: [
      {
        type: 'string',
      },
    ],
  },
  {
    type: 'function',
    name: 'totalSupply',
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
    name: 'transfer',
    constant: false,
    payable: false,
    inputs: [
      {
        type: 'address',
        name: 'to',
      },
      {
        type: 'uint256',
        name: 'amount',
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
    name: 'transferFrom',
    constant: false,
    payable: false,
    inputs: [
      {
        type: 'address',
        name: 'from',
      },
      {
        type: 'address',
        name: 'to',
      },
      {
        type: 'uint256',
        name: 'amount',
      },
    ],
    outputs: [
      {
        type: 'bool',
      },
    ],
  },
] as const;

export class ERC20__factory {
  static readonly abi = _abi;
  static createInterface(): ERC20Interface {
    return new utils.Interface(_abi) as ERC20Interface;
  }
  static connect(address: string, signerOrProvider: Signer | Provider): ERC20 {
    return new Contract(address, _abi, signerOrProvider) as ERC20;
  }
}
