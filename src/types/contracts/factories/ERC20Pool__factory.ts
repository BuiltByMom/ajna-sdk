/* Autogenerated file. Do not edit manually. */
/* tslint:disable */
/* eslint-disable */

import { Contract, Signer, utils } from 'ethers';
import type { Provider } from '@ethersproject/providers';
import type { ERC20Pool, ERC20PoolInterface } from '../ERC20Pool';

const _abi = [
  {
    type: 'error',
    name: 'AddAboveAuctionPrice',
    inputs: [],
  },
  {
    type: 'error',
    name: 'AlreadyInitialized',
    inputs: [],
  },
  {
    type: 'error',
    name: 'AmountLTMinDebt',
    inputs: [],
  },
  {
    type: 'error',
    name: 'AuctionActive',
    inputs: [],
  },
  {
    type: 'error',
    name: 'AuctionNotClearable',
    inputs: [],
  },
  {
    type: 'error',
    name: 'AuctionNotCleared',
    inputs: [],
  },
  {
    type: 'error',
    name: 'AuctionNotTakeable',
    inputs: [],
  },
  {
    type: 'error',
    name: 'AuctionPriceGtBucketPrice',
    inputs: [],
  },
  {
    type: 'error',
    name: 'BorrowerNotSender',
    inputs: [],
  },
  {
    type: 'error',
    name: 'BorrowerOk',
    inputs: [],
  },
  {
    type: 'error',
    name: 'BorrowerUnderCollateralized',
    inputs: [],
  },
  {
    type: 'error',
    name: 'BucketBankruptcyBlock',
    inputs: [],
  },
  {
    type: 'error',
    name: 'BucketIndexOutOfBounds',
    inputs: [],
  },
  {
    type: 'error',
    name: 'CannotMergeToHigherPrice',
    inputs: [],
  },
  {
    type: 'error',
    name: 'DustAmountNotExceeded',
    inputs: [],
  },
  {
    type: 'error',
    name: 'FlashloanCallbackFailed',
    inputs: [],
  },
  {
    type: 'error',
    name: 'FlashloanIncorrectBalance',
    inputs: [],
  },
  {
    type: 'error',
    name: 'FlashloanUnavailableForToken',
    inputs: [],
  },
  {
    type: 'error',
    name: 'InsufficientCollateral',
    inputs: [],
  },
  {
    type: 'error',
    name: 'InsufficientLP',
    inputs: [],
  },
  {
    type: 'error',
    name: 'InsufficientLiquidity',
    inputs: [],
  },
  {
    type: 'error',
    name: 'InvalidAllowancesInput',
    inputs: [],
  },
  {
    type: 'error',
    name: 'InvalidAmount',
    inputs: [],
  },
  {
    type: 'error',
    name: 'InvalidIndex',
    inputs: [],
  },
  {
    type: 'error',
    name: 'LUPBelowHTP',
    inputs: [],
  },
  {
    type: 'error',
    name: 'LimitIndexExceeded',
    inputs: [],
  },
  {
    type: 'error',
    name: 'MoveToSameIndex',
    inputs: [],
  },
  {
    type: 'error',
    name: 'NoAllowance',
    inputs: [],
  },
  {
    type: 'error',
    name: 'NoAuction',
    inputs: [],
  },
  {
    type: 'error',
    name: 'NoClaim',
    inputs: [],
  },
  {
    type: 'error',
    name: 'NoDebt',
    inputs: [],
  },
  {
    type: 'error',
    name: 'NoReserves',
    inputs: [],
  },
  {
    type: 'error',
    name: 'NoReservesAuction',
    inputs: [],
  },
  {
    type: 'error',
    name: 'PRBMathSD59x18__DivInputTooSmall',
    inputs: [],
  },
  {
    type: 'error',
    name: 'PRBMathSD59x18__DivOverflow',
    inputs: [
      {
        type: 'uint256',
        name: 'rAbs',
      },
    ],
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
    name: 'PRBMathSD59x18__SqrtNegativeInput',
    inputs: [
      {
        type: 'int256',
        name: 'x',
      },
    ],
  },
  {
    type: 'error',
    name: 'PRBMathSD59x18__SqrtOverflow',
    inputs: [
      {
        type: 'int256',
        name: 'x',
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
    name: 'PRBMath__MulDivOverflow',
    inputs: [
      {
        type: 'uint256',
        name: 'prod1',
      },
      {
        type: 'uint256',
        name: 'denominator',
      },
    ],
  },
  {
    type: 'error',
    name: 'PriceBelowLUP',
    inputs: [],
  },
  {
    type: 'error',
    name: 'RemoveDepositLockedByAuctionDebt',
    inputs: [],
  },
  {
    type: 'error',
    name: 'ReserveAuctionTooSoon',
    inputs: [],
  },
  {
    type: 'error',
    name: 'TransactionExpired',
    inputs: [],
  },
  {
    type: 'error',
    name: 'TransferToSameOwner',
    inputs: [],
  },
  {
    type: 'error',
    name: 'TransferorNotApproved',
    inputs: [],
  },
  {
    type: 'error',
    name: 'ZeroDebtToCollateral',
    inputs: [],
  },
  {
    type: 'event',
    anonymous: false,
    name: 'AddCollateral',
    inputs: [
      {
        type: 'address',
        name: 'actor',
        indexed: true,
      },
      {
        type: 'uint256',
        name: 'index',
        indexed: true,
      },
      {
        type: 'uint256',
        name: 'amount',
        indexed: false,
      },
      {
        type: 'uint256',
        name: 'lpAwarded',
        indexed: false,
      },
    ],
  },
  {
    type: 'event',
    anonymous: false,
    name: 'AddQuoteToken',
    inputs: [
      {
        type: 'address',
        name: 'lender',
        indexed: true,
      },
      {
        type: 'uint256',
        name: 'index',
        indexed: true,
      },
      {
        type: 'uint256',
        name: 'amount',
        indexed: false,
      },
      {
        type: 'uint256',
        name: 'lpAwarded',
        indexed: false,
      },
      {
        type: 'uint256',
        name: 'lup',
        indexed: false,
      },
    ],
  },
  {
    type: 'event',
    anonymous: false,
    name: 'ApproveLPTransferors',
    inputs: [
      {
        type: 'address',
        name: 'lender',
        indexed: true,
      },
      {
        type: 'address[]',
        name: 'transferors',
        indexed: false,
      },
    ],
  },
  {
    type: 'event',
    anonymous: false,
    name: 'AuctionNFTSettle',
    inputs: [
      {
        type: 'address',
        name: 'borrower',
        indexed: true,
      },
      {
        type: 'uint256',
        name: 'collateral',
        indexed: false,
      },
      {
        type: 'uint256',
        name: 'lp',
        indexed: false,
      },
      {
        type: 'uint256',
        name: 'index',
        indexed: false,
      },
    ],
  },
  {
    type: 'event',
    anonymous: false,
    name: 'AuctionSettle',
    inputs: [
      {
        type: 'address',
        name: 'borrower',
        indexed: true,
      },
      {
        type: 'uint256',
        name: 'collateral',
        indexed: false,
      },
    ],
  },
  {
    type: 'event',
    anonymous: false,
    name: 'BondWithdrawn',
    inputs: [
      {
        type: 'address',
        name: 'kicker',
        indexed: true,
      },
      {
        type: 'address',
        name: 'reciever',
        indexed: true,
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
    name: 'BucketBankruptcy',
    inputs: [
      {
        type: 'uint256',
        name: 'index',
        indexed: true,
      },
      {
        type: 'uint256',
        name: 'lpForfeited',
        indexed: false,
      },
    ],
  },
  {
    type: 'event',
    anonymous: false,
    name: 'BucketTake',
    inputs: [
      {
        type: 'address',
        name: 'borrower',
        indexed: true,
      },
      {
        type: 'uint256',
        name: 'index',
        indexed: false,
      },
      {
        type: 'uint256',
        name: 'amount',
        indexed: false,
      },
      {
        type: 'uint256',
        name: 'collateral',
        indexed: false,
      },
      {
        type: 'uint256',
        name: 'bondChange',
        indexed: false,
      },
      {
        type: 'bool',
        name: 'isReward',
        indexed: false,
      },
    ],
  },
  {
    type: 'event',
    anonymous: false,
    name: 'BucketTakeLPAwarded',
    inputs: [
      {
        type: 'address',
        name: 'taker',
        indexed: true,
      },
      {
        type: 'address',
        name: 'kicker',
        indexed: true,
      },
      {
        type: 'uint256',
        name: 'lpAwardedTaker',
        indexed: false,
      },
      {
        type: 'uint256',
        name: 'lpAwardedKicker',
        indexed: false,
      },
    ],
  },
  {
    type: 'event',
    anonymous: false,
    name: 'DecreaseLPAllowance',
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
        type: 'uint256[]',
        name: 'indexes',
        indexed: false,
      },
      {
        type: 'uint256[]',
        name: 'amounts',
        indexed: false,
      },
    ],
  },
  {
    type: 'event',
    anonymous: false,
    name: 'DrawDebt',
    inputs: [
      {
        type: 'address',
        name: 'borrower',
        indexed: true,
      },
      {
        type: 'uint256',
        name: 'amountBorrowed',
        indexed: false,
      },
      {
        type: 'uint256',
        name: 'collateralPledged',
        indexed: false,
      },
      {
        type: 'uint256',
        name: 'lup',
        indexed: false,
      },
    ],
  },
  {
    type: 'event',
    anonymous: false,
    name: 'Flashloan',
    inputs: [
      {
        type: 'address',
        name: 'receiver',
        indexed: true,
      },
      {
        type: 'address',
        name: 'token',
        indexed: true,
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
    name: 'IncreaseLPAllowance',
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
        type: 'uint256[]',
        name: 'indexes',
        indexed: false,
      },
      {
        type: 'uint256[]',
        name: 'amounts',
        indexed: false,
      },
    ],
  },
  {
    type: 'event',
    anonymous: false,
    name: 'InterestUpdateFailure',
    inputs: [],
  },
  {
    type: 'event',
    anonymous: false,
    name: 'Kick',
    inputs: [
      {
        type: 'address',
        name: 'borrower',
        indexed: true,
      },
      {
        type: 'uint256',
        name: 'debt',
        indexed: false,
      },
      {
        type: 'uint256',
        name: 'collateral',
        indexed: false,
      },
      {
        type: 'uint256',
        name: 'bond',
        indexed: false,
      },
    ],
  },
  {
    type: 'event',
    anonymous: false,
    name: 'KickReserveAuction',
    inputs: [
      {
        type: 'uint256',
        name: 'claimableReservesRemaining',
        indexed: false,
      },
      {
        type: 'uint256',
        name: 'auctionPrice',
        indexed: false,
      },
      {
        type: 'uint256',
        name: 'currentBurnEpoch',
        indexed: false,
      },
    ],
  },
  {
    type: 'event',
    anonymous: false,
    name: 'LoanStamped',
    inputs: [
      {
        type: 'address',
        name: 'borrower',
        indexed: true,
      },
    ],
  },
  {
    type: 'event',
    anonymous: false,
    name: 'MoveQuoteToken',
    inputs: [
      {
        type: 'address',
        name: 'lender',
        indexed: true,
      },
      {
        type: 'uint256',
        name: 'from',
        indexed: true,
      },
      {
        type: 'uint256',
        name: 'to',
        indexed: true,
      },
      {
        type: 'uint256',
        name: 'amount',
        indexed: false,
      },
      {
        type: 'uint256',
        name: 'lpRedeemedFrom',
        indexed: false,
      },
      {
        type: 'uint256',
        name: 'lpAwardedTo',
        indexed: false,
      },
      {
        type: 'uint256',
        name: 'lup',
        indexed: false,
      },
    ],
  },
  {
    type: 'event',
    anonymous: false,
    name: 'RemoveCollateral',
    inputs: [
      {
        type: 'address',
        name: 'claimer',
        indexed: true,
      },
      {
        type: 'uint256',
        name: 'index',
        indexed: true,
      },
      {
        type: 'uint256',
        name: 'amount',
        indexed: false,
      },
      {
        type: 'uint256',
        name: 'lpRedeemed',
        indexed: false,
      },
    ],
  },
  {
    type: 'event',
    anonymous: false,
    name: 'RemoveQuoteToken',
    inputs: [
      {
        type: 'address',
        name: 'lender',
        indexed: true,
      },
      {
        type: 'uint256',
        name: 'index',
        indexed: true,
      },
      {
        type: 'uint256',
        name: 'amount',
        indexed: false,
      },
      {
        type: 'uint256',
        name: 'lpRedeemed',
        indexed: false,
      },
      {
        type: 'uint256',
        name: 'lup',
        indexed: false,
      },
    ],
  },
  {
    type: 'event',
    anonymous: false,
    name: 'RepayDebt',
    inputs: [
      {
        type: 'address',
        name: 'borrower',
        indexed: true,
      },
      {
        type: 'uint256',
        name: 'quoteRepaid',
        indexed: false,
      },
      {
        type: 'uint256',
        name: 'collateralPulled',
        indexed: false,
      },
      {
        type: 'uint256',
        name: 'lup',
        indexed: false,
      },
    ],
  },
  {
    type: 'event',
    anonymous: false,
    name: 'ReserveAuction',
    inputs: [
      {
        type: 'uint256',
        name: 'claimableReservesRemaining',
        indexed: false,
      },
      {
        type: 'uint256',
        name: 'auctionPrice',
        indexed: false,
      },
      {
        type: 'uint256',
        name: 'currentBurnEpoch',
        indexed: false,
      },
    ],
  },
  {
    type: 'event',
    anonymous: false,
    name: 'ResetInterestRate',
    inputs: [
      {
        type: 'uint256',
        name: 'oldRate',
        indexed: false,
      },
      {
        type: 'uint256',
        name: 'newRate',
        indexed: false,
      },
    ],
  },
  {
    type: 'event',
    anonymous: false,
    name: 'RevokeLPAllowance',
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
        type: 'uint256[]',
        name: 'indexes',
        indexed: false,
      },
    ],
  },
  {
    type: 'event',
    anonymous: false,
    name: 'RevokeLPTransferors',
    inputs: [
      {
        type: 'address',
        name: 'lender',
        indexed: true,
      },
      {
        type: 'address[]',
        name: 'transferors',
        indexed: false,
      },
    ],
  },
  {
    type: 'event',
    anonymous: false,
    name: 'Settle',
    inputs: [
      {
        type: 'address',
        name: 'borrower',
        indexed: true,
      },
      {
        type: 'uint256',
        name: 'settledDebt',
        indexed: false,
      },
    ],
  },
  {
    type: 'event',
    anonymous: false,
    name: 'Take',
    inputs: [
      {
        type: 'address',
        name: 'borrower',
        indexed: true,
      },
      {
        type: 'uint256',
        name: 'amount',
        indexed: false,
      },
      {
        type: 'uint256',
        name: 'collateral',
        indexed: false,
      },
      {
        type: 'uint256',
        name: 'bondChange',
        indexed: false,
      },
      {
        type: 'bool',
        name: 'isReward',
        indexed: false,
      },
    ],
  },
  {
    type: 'event',
    anonymous: false,
    name: 'TransferLP',
    inputs: [
      {
        type: 'address',
        name: 'owner',
        indexed: false,
      },
      {
        type: 'address',
        name: 'newOwner',
        indexed: false,
      },
      {
        type: 'uint256[]',
        name: 'indexes',
        indexed: false,
      },
      {
        type: 'uint256',
        name: 'lp',
        indexed: false,
      },
    ],
  },
  {
    type: 'event',
    anonymous: false,
    name: 'UpdateInterestRate',
    inputs: [
      {
        type: 'uint256',
        name: 'oldRate',
        indexed: false,
      },
      {
        type: 'uint256',
        name: 'newRate',
        indexed: false,
      },
    ],
  },
  {
    type: 'function',
    name: 'addCollateral',
    constant: false,
    payable: false,
    inputs: [
      {
        type: 'uint256',
        name: 'amountToAdd_',
      },
      {
        type: 'uint256',
        name: 'index_',
      },
      {
        type: 'uint256',
        name: 'expiry_',
      },
    ],
    outputs: [
      {
        type: 'uint256',
        name: 'bucketLP_',
      },
    ],
  },
  {
    type: 'function',
    name: 'addQuoteToken',
    constant: false,
    payable: false,
    inputs: [
      {
        type: 'uint256',
        name: 'amount_',
      },
      {
        type: 'uint256',
        name: 'index_',
      },
      {
        type: 'uint256',
        name: 'expiry_',
      },
    ],
    outputs: [
      {
        type: 'uint256',
        name: 'bucketLP_',
      },
      {
        type: 'uint256',
        name: 'addedAmount_',
      },
    ],
  },
  {
    type: 'function',
    name: 'approveLPTransferors',
    constant: false,
    payable: false,
    inputs: [
      {
        type: 'address[]',
        name: 'transferors_',
      },
    ],
    outputs: [],
  },
  {
    type: 'function',
    name: 'approvedTransferors',
    constant: true,
    stateMutability: 'view',
    payable: false,
    inputs: [
      {
        type: 'address',
      },
      {
        type: 'address',
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
    name: 'auctionInfo',
    constant: true,
    stateMutability: 'view',
    payable: false,
    inputs: [
      {
        type: 'address',
        name: 'borrower_',
      },
    ],
    outputs: [
      {
        type: 'address',
        name: 'kicker_',
      },
      {
        type: 'uint256',
        name: 'bondFactor_',
      },
      {
        type: 'uint256',
        name: 'bondSize_',
      },
      {
        type: 'uint256',
        name: 'kickTime_',
      },
      {
        type: 'uint256',
        name: 'referencePrice_',
      },
      {
        type: 'uint256',
        name: 'neutralPrice_',
      },
      {
        type: 'uint256',
        name: 'debtToCollateral_',
      },
      {
        type: 'address',
        name: 'head_',
      },
      {
        type: 'address',
        name: 'next_',
      },
      {
        type: 'address',
        name: 'prev_',
      },
    ],
  },
  {
    type: 'function',
    name: 'borrowerInfo',
    constant: true,
    stateMutability: 'view',
    payable: false,
    inputs: [
      {
        type: 'address',
        name: 'borrower_',
      },
    ],
    outputs: [
      {
        type: 'uint256',
      },
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
    name: 'bucketCollateralDust',
    constant: true,
    stateMutability: 'pure',
    payable: false,
    inputs: [
      {
        type: 'uint256',
        name: 'bucketIndex_',
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
    name: 'bucketExchangeRate',
    constant: true,
    stateMutability: 'view',
    payable: false,
    inputs: [
      {
        type: 'uint256',
        name: 'index_',
      },
    ],
    outputs: [
      {
        type: 'uint256',
        name: 'exchangeRate_',
      },
    ],
  },
  {
    type: 'function',
    name: 'bucketInfo',
    constant: true,
    stateMutability: 'view',
    payable: false,
    inputs: [
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
      {
        type: 'uint256',
      },
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
    name: 'bucketTake',
    constant: false,
    payable: false,
    inputs: [
      {
        type: 'address',
        name: 'borrowerAddress_',
      },
      {
        type: 'bool',
        name: 'depositTake_',
      },
      {
        type: 'uint256',
        name: 'index_',
      },
    ],
    outputs: [],
  },
  {
    type: 'function',
    name: 'burnInfo',
    constant: true,
    stateMutability: 'view',
    payable: false,
    inputs: [
      {
        type: 'uint256',
        name: 'burnEventEpoch_',
      },
    ],
    outputs: [
      {
        type: 'uint256',
      },
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
    name: 'collateralAddress',
    constant: true,
    stateMutability: 'pure',
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
    name: 'collateralScale',
    constant: true,
    stateMutability: 'pure',
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
    name: 'currentBurnEpoch',
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
    name: 'debtInfo',
    constant: true,
    stateMutability: 'view',
    payable: false,
    inputs: [],
    outputs: [
      {
        type: 'uint256',
      },
      {
        type: 'uint256',
      },
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
    name: 'decreaseLPAllowance',
    constant: false,
    payable: false,
    inputs: [
      {
        type: 'address',
        name: 'spender_',
      },
      {
        type: 'uint256[]',
        name: 'indexes_',
      },
      {
        type: 'uint256[]',
        name: 'amounts_',
      },
    ],
    outputs: [],
  },
  {
    type: 'function',
    name: 'depositIndex',
    constant: true,
    stateMutability: 'view',
    payable: false,
    inputs: [
      {
        type: 'uint256',
        name: 'debt_',
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
    name: 'depositScale',
    constant: true,
    stateMutability: 'view',
    payable: false,
    inputs: [
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
    name: 'depositSize',
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
    name: 'depositUpToIndex',
    constant: true,
    stateMutability: 'view',
    payable: false,
    inputs: [
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
    name: 'depositUtilization',
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
    name: 'drawDebt',
    constant: false,
    payable: false,
    inputs: [
      {
        type: 'address',
        name: 'borrowerAddress_',
      },
      {
        type: 'uint256',
        name: 'amountToBorrow_',
      },
      {
        type: 'uint256',
        name: 'limitIndex_',
      },
      {
        type: 'uint256',
        name: 'collateralToPledge_',
      },
    ],
    outputs: [],
  },
  {
    type: 'function',
    name: 'emasInfo',
    constant: true,
    stateMutability: 'view',
    payable: false,
    inputs: [],
    outputs: [
      {
        type: 'uint256',
      },
      {
        type: 'uint256',
      },
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
    name: 'flashFee',
    constant: true,
    stateMutability: 'view',
    payable: false,
    inputs: [
      {
        type: 'address',
        name: 'token_',
      },
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
    name: 'flashLoan',
    constant: false,
    payable: false,
    inputs: [
      {
        type: 'address',
        name: 'receiver_',
      },
      {
        type: 'address',
        name: 'token_',
      },
      {
        type: 'uint256',
        name: 'amount_',
      },
      {
        type: 'bytes',
        name: 'data_',
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
    name: 'increaseLPAllowance',
    constant: false,
    payable: false,
    inputs: [
      {
        type: 'address',
        name: 'spender_',
      },
      {
        type: 'uint256[]',
        name: 'indexes_',
      },
      {
        type: 'uint256[]',
        name: 'amounts_',
      },
    ],
    outputs: [],
  },
  {
    type: 'function',
    name: 'inflatorInfo',
    constant: true,
    stateMutability: 'view',
    payable: false,
    inputs: [],
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
    name: 'initialize',
    constant: false,
    payable: false,
    inputs: [
      {
        type: 'uint256',
        name: 'rate_',
      },
    ],
    outputs: [],
  },
  {
    type: 'function',
    name: 'interestRateInfo',
    constant: true,
    stateMutability: 'view',
    payable: false,
    inputs: [],
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
    name: 'kick',
    constant: false,
    payable: false,
    inputs: [
      {
        type: 'address',
        name: 'borrower_',
      },
      {
        type: 'uint256',
        name: 'npLimitIndex_',
      },
    ],
    outputs: [],
  },
  {
    type: 'function',
    name: 'kickReserveAuction',
    constant: false,
    payable: false,
    inputs: [],
    outputs: [],
  },
  {
    type: 'function',
    name: 'kickerInfo',
    constant: true,
    stateMutability: 'view',
    payable: false,
    inputs: [
      {
        type: 'address',
        name: 'kicker_',
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
    name: 'lenderInfo',
    constant: true,
    stateMutability: 'view',
    payable: false,
    inputs: [
      {
        type: 'uint256',
        name: 'index_',
      },
      {
        type: 'address',
        name: 'lender_',
      },
    ],
    outputs: [
      {
        type: 'uint256',
        name: 'lpBalance_',
      },
      {
        type: 'uint256',
        name: 'depositTime_',
      },
    ],
  },
  {
    type: 'function',
    name: 'lenderKick',
    constant: false,
    payable: false,
    inputs: [
      {
        type: 'uint256',
        name: 'index_',
      },
      {
        type: 'uint256',
        name: 'npLimitIndex_',
      },
    ],
    outputs: [],
  },
  {
    type: 'function',
    name: 'loanInfo',
    constant: true,
    stateMutability: 'view',
    payable: false,
    inputs: [
      {
        type: 'uint256',
        name: 'loanId_',
      },
    ],
    outputs: [
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
    name: 'loansInfo',
    constant: true,
    stateMutability: 'view',
    payable: false,
    inputs: [],
    outputs: [
      {
        type: 'address',
      },
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
    name: 'lpAllowance',
    constant: true,
    stateMutability: 'view',
    payable: false,
    inputs: [
      {
        type: 'uint256',
        name: 'index_',
      },
      {
        type: 'address',
        name: 'spender_',
      },
      {
        type: 'address',
        name: 'owner_',
      },
    ],
    outputs: [
      {
        type: 'uint256',
        name: 'allowance_',
      },
    ],
  },
  {
    type: 'function',
    name: 'maxFlashLoan',
    constant: true,
    stateMutability: 'view',
    payable: false,
    inputs: [
      {
        type: 'address',
        name: 'token_',
      },
    ],
    outputs: [
      {
        type: 'uint256',
        name: 'maxLoan_',
      },
    ],
  },
  {
    type: 'function',
    name: 'moveQuoteToken',
    constant: false,
    payable: false,
    inputs: [
      {
        type: 'uint256',
        name: 'maxAmount_',
      },
      {
        type: 'uint256',
        name: 'fromIndex_',
      },
      {
        type: 'uint256',
        name: 'toIndex_',
      },
      {
        type: 'uint256',
        name: 'expiry_',
      },
    ],
    outputs: [
      {
        type: 'uint256',
        name: 'fromBucketLP_',
      },
      {
        type: 'uint256',
        name: 'toBucketLP_',
      },
      {
        type: 'uint256',
        name: 'movedAmount_',
      },
    ],
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
    name: 'pledgedCollateral',
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
    name: 'poolType',
    constant: true,
    stateMutability: 'pure',
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
    name: 'quoteTokenAddress',
    constant: true,
    stateMutability: 'pure',
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
    name: 'quoteTokenScale',
    constant: true,
    stateMutability: 'pure',
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
    name: 'removeCollateral',
    constant: false,
    payable: false,
    inputs: [
      {
        type: 'uint256',
        name: 'maxAmount_',
      },
      {
        type: 'uint256',
        name: 'index_',
      },
    ],
    outputs: [
      {
        type: 'uint256',
        name: 'removedAmount_',
      },
      {
        type: 'uint256',
        name: 'redeemedLP_',
      },
    ],
  },
  {
    type: 'function',
    name: 'removeQuoteToken',
    constant: false,
    payable: false,
    inputs: [
      {
        type: 'uint256',
        name: 'maxAmount_',
      },
      {
        type: 'uint256',
        name: 'index_',
      },
    ],
    outputs: [
      {
        type: 'uint256',
        name: 'removedAmount_',
      },
      {
        type: 'uint256',
        name: 'redeemedLP_',
      },
    ],
  },
  {
    type: 'function',
    name: 'repayDebt',
    constant: false,
    payable: false,
    inputs: [
      {
        type: 'address',
        name: 'borrowerAddress_',
      },
      {
        type: 'uint256',
        name: 'maxQuoteTokenAmountToRepay_',
      },
      {
        type: 'uint256',
        name: 'collateralAmountToPull_',
      },
      {
        type: 'address',
        name: 'collateralReceiver_',
      },
      {
        type: 'uint256',
        name: 'limitIndex_',
      },
    ],
    outputs: [
      {
        type: 'uint256',
        name: 'amountRepaid_',
      },
    ],
  },
  {
    type: 'function',
    name: 'reservesInfo',
    constant: true,
    stateMutability: 'view',
    payable: false,
    inputs: [],
    outputs: [
      {
        type: 'uint256',
      },
      {
        type: 'uint256',
      },
      {
        type: 'uint256',
      },
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
    name: 'revokeLPAllowance',
    constant: false,
    payable: false,
    inputs: [
      {
        type: 'address',
        name: 'spender_',
      },
      {
        type: 'uint256[]',
        name: 'indexes_',
      },
    ],
    outputs: [],
  },
  {
    type: 'function',
    name: 'revokeLPTransferors',
    constant: false,
    payable: false,
    inputs: [
      {
        type: 'address[]',
        name: 'transferors_',
      },
    ],
    outputs: [],
  },
  {
    type: 'function',
    name: 'settle',
    constant: false,
    payable: false,
    inputs: [
      {
        type: 'address',
        name: 'borrowerAddress_',
      },
      {
        type: 'uint256',
        name: 'maxDepth_',
      },
    ],
    outputs: [
      {
        type: 'uint256',
        name: 'collateralSettled_',
      },
      {
        type: 'bool',
        name: 'isBorrowerSettled_',
      },
    ],
  },
  {
    type: 'function',
    name: 'stampLoan',
    constant: false,
    payable: false,
    inputs: [],
    outputs: [],
  },
  {
    type: 'function',
    name: 'take',
    constant: false,
    payable: false,
    inputs: [
      {
        type: 'address',
        name: 'borrowerAddress_',
      },
      {
        type: 'uint256',
        name: 'maxAmount_',
      },
      {
        type: 'address',
        name: 'callee_',
      },
      {
        type: 'bytes',
        name: 'data_',
      },
    ],
    outputs: [
      {
        type: 'uint256',
        name: 'collateralTaken_',
      },
    ],
  },
  {
    type: 'function',
    name: 'takeReserves',
    constant: false,
    payable: false,
    inputs: [
      {
        type: 'uint256',
        name: 'maxAmount_',
      },
    ],
    outputs: [
      {
        type: 'uint256',
        name: 'amount_',
      },
    ],
  },
  {
    type: 'function',
    name: 'totalAuctionsInPool',
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
    name: 'totalT0Debt',
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
    name: 'totalT0DebtInAuction',
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
    name: 'transferLP',
    constant: false,
    payable: false,
    inputs: [
      {
        type: 'address',
        name: 'owner_',
      },
      {
        type: 'address',
        name: 'newOwner_',
      },
      {
        type: 'uint256[]',
        name: 'indexes_',
      },
    ],
    outputs: [],
  },
  {
    type: 'function',
    name: 'updateInterest',
    constant: false,
    payable: false,
    inputs: [],
    outputs: [],
  },
  {
    type: 'function',
    name: 'withdrawBonds',
    constant: false,
    payable: false,
    inputs: [
      {
        type: 'address',
        name: 'recipient_',
      },
      {
        type: 'uint256',
        name: 'maxAmount_',
      },
    ],
    outputs: [
      {
        type: 'uint256',
        name: 'withdrawnAmount_',
      },
    ],
  },
] as const;

export class ERC20Pool__factory {
  static readonly abi = _abi;
  static createInterface(): ERC20PoolInterface {
    return new utils.Interface(_abi) as ERC20PoolInterface;
  }
  static connect(address: string, signerOrProvider: Signer | Provider): ERC20Pool {
    return new Contract(address, _abi, signerOrProvider) as ERC20Pool;
  }
}
