/* Autogenerated file. Do not edit manually. */
/* tslint:disable */
/* eslint-disable */

import { Contract, Signer, utils } from 'ethers';
import type { Provider } from '@ethersproject/providers';
import type { PositionManager, PositionManagerInterface } from '../PositionManager';

const _abi = [
  {
    type: 'constructor',
    payable: false,
    inputs: [
      {
        type: 'address',
        name: 'erc20Factory_',
      },
      {
        type: 'address',
        name: 'erc721Factory_',
      },
    ],
  },
  {
    type: 'error',
    name: 'BucketBankrupt',
    inputs: [],
  },
  {
    type: 'error',
    name: 'BucketIndexOutOfBounds',
    inputs: [],
  },
  {
    type: 'error',
    name: 'LiquidityNotRemoved',
    inputs: [],
  },
  {
    type: 'error',
    name: 'NoAuth',
    inputs: [],
  },
  {
    type: 'error',
    name: 'NotAjnaPool',
    inputs: [],
  },
  {
    type: 'error',
    name: 'PRBMathSD59x18__Exp2InputTooBig',
    inputs: [
      {
        type: 'int256',
        name: 'x',
      },
    ],
  },
  {
    type: 'error',
    name: 'PRBMathSD59x18__FromIntOverflow',
    inputs: [
      {
        type: 'int256',
        name: 'x',
      },
    ],
  },
  {
    type: 'error',
    name: 'PRBMathSD59x18__FromIntUnderflow',
    inputs: [
      {
        type: 'int256',
        name: 'x',
      },
    ],
  },
  {
    type: 'error',
    name: 'PRBMathSD59x18__LogInputTooSmall',
    inputs: [
      {
        type: 'int256',
        name: 'x',
      },
    ],
  },
  {
    type: 'error',
    name: 'PRBMathSD59x18__MulInputTooSmall',
    inputs: [],
  },
  {
    type: 'error',
    name: 'PRBMathSD59x18__MulOverflow',
    inputs: [
      {
        type: 'uint256',
        name: 'rAbs',
      },
    ],
  },
  {
    type: 'error',
    name: 'PRBMath__MulDivFixedPointOverflow',
    inputs: [
      {
        type: 'uint256',
        name: 'prod1',
      },
    ],
  },
  {
    type: 'error',
    name: 'RemovePositionFailed',
    inputs: [],
  },
  {
    type: 'error',
    name: 'WrongPool',
    inputs: [],
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
        name: 'approved',
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
    name: 'ApprovalForAll',
    inputs: [
      {
        type: 'address',
        name: 'owner',
        indexed: true,
      },
      {
        type: 'address',
        name: 'operator',
        indexed: true,
      },
      {
        type: 'bool',
        name: 'approved',
        indexed: false,
      },
    ],
  },
  {
    type: 'event',
    anonymous: false,
    name: 'Burn',
    inputs: [
      {
        type: 'address',
        name: 'lender',
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
    name: 'MemorializePosition',
    inputs: [
      {
        type: 'address',
        name: 'lender',
        indexed: true,
      },
      {
        type: 'uint256',
        name: 'tokenId',
        indexed: false,
      },
      {
        type: 'uint256[]',
        name: 'indexes',
        indexed: false,
      },
    ],
  },
  {
    type: 'event',
    anonymous: false,
    name: 'Mint',
    inputs: [
      {
        type: 'address',
        name: 'lender',
        indexed: true,
      },
      {
        type: 'address',
        name: 'pool',
        indexed: true,
      },
      {
        type: 'uint256',
        name: 'tokenId',
        indexed: false,
      },
    ],
  },
  {
    type: 'event',
    anonymous: false,
    name: 'MoveLiquidity',
    inputs: [
      {
        type: 'address',
        name: 'lender',
        indexed: true,
      },
      {
        type: 'uint256',
        name: 'tokenId',
        indexed: false,
      },
      {
        type: 'uint256',
        name: 'fromIndex',
        indexed: false,
      },
      {
        type: 'uint256',
        name: 'toIndex',
        indexed: false,
      },
    ],
  },
  {
    type: 'event',
    anonymous: false,
    name: 'RedeemPosition',
    inputs: [
      {
        type: 'address',
        name: 'lender',
        indexed: true,
      },
      {
        type: 'uint256',
        name: 'tokenId',
        indexed: false,
      },
      {
        type: 'uint256[]',
        name: 'indexes',
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
        name: 'tokenId',
        indexed: true,
      },
    ],
  },
  {
    type: 'function',
    name: 'DOMAIN_SEPARATOR',
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
    name: 'PERMIT_TYPEHASH',
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
    name: 'approve',
    constant: false,
    payable: false,
    inputs: [
      {
        type: 'address',
        name: 'to',
      },
      {
        type: 'uint256',
        name: 'tokenId',
      },
    ],
    outputs: [],
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
        name: 'owner',
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
    name: 'burn',
    constant: false,
    payable: false,
    inputs: [
      {
        type: 'tuple',
        name: 'params_',
        components: [
          {
            type: 'uint256',
            name: 'tokenId',
          },
          {
            type: 'address',
            name: 'pool',
          },
        ],
      },
    ],
    outputs: [],
  },
  {
    type: 'function',
    name: 'getApproved',
    constant: true,
    stateMutability: 'view',
    payable: false,
    inputs: [
      {
        type: 'uint256',
        name: 'tokenId',
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
    name: 'getLPs',
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
        name: 'index_',
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
    name: 'getPositionIndexes',
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
        type: 'uint256[]',
      },
    ],
  },
  {
    type: 'function',
    name: 'getPositionIndexesFiltered',
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
        type: 'uint256[]',
        name: 'filteredIndexes_',
      },
    ],
  },
  {
    type: 'function',
    name: 'getPositionInfo',
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
        name: 'index_',
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
    name: 'isApprovedForAll',
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
        name: 'operator',
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
    name: 'isIndexInPosition',
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
        name: 'index_',
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
    name: 'isPositionBucketBankrupt',
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
        name: 'index_',
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
    name: 'memorializePositions',
    constant: false,
    payable: false,
    inputs: [
      {
        type: 'tuple',
        name: 'params_',
        components: [
          {
            type: 'uint256',
            name: 'tokenId',
          },
          {
            type: 'uint256[]',
            name: 'indexes',
          },
        ],
      },
    ],
    outputs: [],
  },
  {
    type: 'function',
    name: 'mint',
    constant: false,
    payable: false,
    inputs: [
      {
        type: 'tuple',
        name: 'params_',
        components: [
          {
            type: 'address',
            name: 'recipient',
          },
          {
            type: 'address',
            name: 'pool',
          },
          {
            type: 'bytes32',
            name: 'poolSubsetHash',
          },
        ],
      },
    ],
    outputs: [
      {
        type: 'uint256',
        name: 'tokenId_',
      },
    ],
  },
  {
    type: 'function',
    name: 'moveLiquidity',
    constant: false,
    payable: false,
    inputs: [
      {
        type: 'tuple',
        name: 'params_',
        components: [
          {
            type: 'uint256',
            name: 'tokenId',
          },
          {
            type: 'address',
            name: 'pool',
          },
          {
            type: 'uint256',
            name: 'fromIndex',
          },
          {
            type: 'uint256',
            name: 'toIndex',
          },
          {
            type: 'uint256',
            name: 'expiry',
          },
        ],
      },
    ],
    outputs: [],
  },
  {
    type: 'function',
    name: 'multicall',
    constant: false,
    payable: false,
    inputs: [
      {
        type: 'bytes[]',
        name: 'data',
      },
    ],
    outputs: [
      {
        type: 'bytes[]',
        name: 'results',
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
    name: 'ownerOf',
    constant: true,
    stateMutability: 'view',
    payable: false,
    inputs: [
      {
        type: 'uint256',
        name: 'tokenId',
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
    name: 'permit',
    constant: false,
    payable: false,
    inputs: [
      {
        type: 'address',
        name: 'spender_',
      },
      {
        type: 'uint256',
        name: 'tokenId_',
      },
      {
        type: 'uint256',
        name: 'deadline_',
      },
      {
        type: 'uint8',
        name: 'v_',
      },
      {
        type: 'bytes32',
        name: 'r_',
      },
      {
        type: 'bytes32',
        name: 's_',
      },
    ],
    outputs: [],
  },
  {
    type: 'function',
    name: 'poolKey',
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
    name: 'reedemPositions',
    constant: false,
    payable: false,
    inputs: [
      {
        type: 'tuple',
        name: 'params_',
        components: [
          {
            type: 'uint256',
            name: 'tokenId',
          },
          {
            type: 'address',
            name: 'pool',
          },
          {
            type: 'uint256[]',
            name: 'indexes',
          },
        ],
      },
    ],
    outputs: [],
  },
  {
    type: 'function',
    name: 'safeTransferFrom',
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
        name: 'tokenId',
      },
    ],
    outputs: [],
  },
  {
    type: 'function',
    name: 'safeTransferFrom',
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
        name: 'tokenId',
      },
      {
        type: 'bytes',
        name: 'data',
      },
    ],
    outputs: [],
  },
  {
    type: 'function',
    name: 'setApprovalForAll',
    constant: false,
    payable: false,
    inputs: [
      {
        type: 'address',
        name: 'operator',
      },
      {
        type: 'bool',
        name: 'approved',
      },
    ],
    outputs: [],
  },
  {
    type: 'function',
    name: 'supportsInterface',
    constant: true,
    stateMutability: 'view',
    payable: false,
    inputs: [
      {
        type: 'bytes4',
        name: 'interfaceId',
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
    name: 'tokenURI',
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
        type: 'string',
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
        name: 'tokenId',
      },
    ],
    outputs: [],
  },
] as const;

export class PositionManager__factory {
  static readonly abi = _abi;
  static createInterface(): PositionManagerInterface {
    return new utils.Interface(_abi) as PositionManagerInterface;
  }
  static connect(address: string, signerOrProvider: Signer | Provider): PositionManager {
    return new Contract(address, _abi, signerOrProvider) as PositionManager;
  }
}
