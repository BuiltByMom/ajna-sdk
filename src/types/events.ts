import { TransactionReceipt } from '@ethersproject/providers';

export enum EventName {
  PoolCreated = 'PoolCreated',
  Transfer = 'Transfer',
  Approval = 'Approval',
  // ERC20Pool
  AddCollateral = 'AddCollateral',
  DrawDebt = 'DrawDebt',
  // ERC721Pool
  AddCollateralNFT = 'AddCollateralNFT',
  MergeOrRemoveCollateralNFT = 'MergeOrRemoveCollateralNFT',
  DrawDebtNFT = 'DrawDebtNFT',
  // Lender
  AddQuoteToken = 'AddQuoteToken',
  MoveQuoteToken = 'MoveQuoteToken',
  RemoveQuoteToken = 'RemoveQuoteToken',
  RemoveCollateral = 'RemoveCollateral',
  // Borrower
  RepayDebt = 'RepayDebt',
  // Pool Common
  BucketBankruptcy = 'BucketBankruptcy',
  Flashloan = 'Flashloan',
  LoanStamped = 'LoanStamped',
  ResetInterestRate = 'ResetInterestRate',
  UpdateInterestRate = 'UpdateInterestRate',
  // Auction
  Kick = 'Kick',
  BondWithdrawn = 'BondWithdrawn',
  BucketTake = 'BucketTake',
  BucketTakeLPAwarded = 'BucketTakeLPAwarded',
  Take = 'Take',
  Settle = 'Settle',
  AuctionSettle = 'AuctionSettle',
  AuctionNFTSettle = 'AuctionNFTSettle',
  KickReserveAuction = 'KickReserveAuction',
  ReserveAuction = 'ReserveAuction',
  // LP Transfer
  IncreaseLPAllowance = 'IncreaseLPAllowance',
  DecreaseLPAllowance = 'DecreaseLPAllowance',
  RevokeLPAllowance = 'RevokeLPAllowance',
  ApproveLPTransferors = 'ApproveLPTransferors',
  RevokeLPTransferors = 'RevokeLPTransferors',
  TransferLP = 'TransferLP',
  // PositionManager
  Mint = 'Mint',
  Burn = 'Burn',
  MoveLiquidity = 'MoveLiquidity',
  MemorializePosition = 'MemorializePosition',
  RedeemPosition = 'RedeemPosition',
  // RewardsManager
  ClaimRewards = 'ClaimRewards',
  MoveStakedLiquidity = 'MoveStakedLiquidity',
  Stake = 'Stake',
  UpdateExchangeRates = 'UpdateExchangeRates',
  Unstake = 'Unstake',
}

export interface TransactionLogDetails {
  eventName: string;
  signature: string;
  address: string;
  parsedArgs: {
    [arg: string]: any;
  };
  topic: string;
  inputs: any[];
  data?: string;
  txHash: string;
}

export interface EventArgs {
  [eventArg: string]: any;
}

export const FunctionEventName = {
  deployPool: EventName.PoolCreated,
  transfer: EventName.Transfer,
  mint: EventName.Mint,
  burn: EventName.Burn,
  addQuoteToken: EventName.AddQuoteToken,
  addCollateral: EventName.AddCollateral,
  drawDebt: EventName.DrawDebt,
  repayDebt: EventName.RepayDebt,
  approvedTransferors: EventName.Approval,
  approveLPTransferors: EventName.ApproveLPTransferors,
  memorializePositions: EventName.MemorializePosition,
  redeemPositions: EventName.RedeemPosition,
  revokeLPTransferors: EventName.RevokeLPTransferors,
  settle: EventName.Settle,
  take: EventName.Take,
  takeReserves: EventName.ReserveAuction,
  transferLP: EventName.TransferLP,
  updateInterest: EventName.UpdateInterestRate,
  withdrawBonds: EventName.BondWithdrawn,
};

export type ParsedLogsByEventName = {
  [eventName in EventName]: TransactionLogDetails;
};

export interface ContractEventDetails {
  address: string;
  eventName: string;
  eventSignature?: string;
  parsedArgs: {
    [arg: string]: any;
  };
  topics: string[];
  data: string;
  txHash: string;
}

export type ParsedEventsByEventName = {
  [eventName in EventName]: ContractEventDetails;
};

export interface TransactionEventDetails {
  transaction: {
    hash: string;
    receipt: TransactionReceipt;
    methodName: string;
    args: any[];
    contractName: string;
    contractAddress: string;
  };
  event: {
    eventName: EventName;
    args: any;
  };
}
