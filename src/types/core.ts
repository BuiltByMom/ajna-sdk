import { TransactionReceipt, TransactionResponse } from '@ethersproject/providers';
import { BigNumber, Contract, Signer as EthersSigner, providers } from 'ethers';

export type Signer = EthersSigner;

export type SignerOrProvider = Signer | providers.Provider;

export type Provider = providers.Provider;

export type Address = string;

export type CollateralAddress = Address;

export type QuoteAddress = Address;

type BaseParams = {
  signer: Signer;
};

type BaseParamsWithContract = {
  contract: Contract;
};

export type GenericApproveParamsContract = {
  provider: SignerOrProvider;
  poolAddress: Address;
  allowance: BigNumber;
  tokenAddress: CollateralAddress | QuoteAddress;
};

export type GenericApproveParams = BaseParams & {
  allowance: BigNumber;
};

/************** Class Interfaces **************/

export type AddQuoteTokenParams = BaseParams & {
  amount: BigNumber;
  bucketIndex: number;
  ttlSeconds: number | null;
};

export type DepositIndexParams = BaseParams & {
  debtAmount: BigNumber;
};

export type DebtInfoParams = BaseParams;

export type DrawDebtParams = BaseParams & {
  amountToBorrow: BigNumber;
  limitIndex: number | null;
  collateralToPledge: BigNumber;
};

export type EstimateLoanParams = BaseParams & {
  debtAmount: BigNumber;
  collateralAmount: BigNumber;
};

export type GetIndexesPriceByRangeParams = {
  minPrice: BigNumber;
  maxPrice: BigNumber;
};

export type GetPositionParams = BaseParams & {
  bucketIndex: number;
  proposedWithdrawal: BigNumber | null;
};

export type MoveQuoteTokenParams = BaseParams & {
  maxAmountToMove: BigNumber;
  fromIndex: number;
  toIndex: number;
  ttlSeconds: number | null;
};

export type LenderInfoParamsContract = BaseParamsWithContract & {
  index: number;
  lenderAddress: Address;
};

export type LenderInfoParams = BaseParams & {
  index: number;
  lenderAddress: Address;
};

export type LoansInfoParams = BaseParams;

export type RepayDebtParams = BaseParams & {
  maxQuoteTokenAmountToRepay: BigNumber;
  collateralAmountToPull: BigNumber;
  limitIndex: number | null;
};

export type RemoveQuoteTokenParams = BaseParams & {
  maxAmount: BigNumber;
  bucketIndex: number;
};

export type RepayParams = BaseParams & {
  amount: BigNumber;
};

/************** Contract Interfaces **************/

export type AddQuoteTokenParamsContract = BaseParamsWithContract & {
  amount: BigNumber;
  bucketIndex: number;
  expiry: number;
};

export type BorrowerInfoParamsContract = BaseParamsWithContract & {
  poolAddress: Address;
  borrowerAddress: Address;
};

export type CollateralBalanceParamsContract = {
  provider: SignerOrProvider;
  collateralAddress: Address;
  holderAddress: Address;
};

export type DebtInfoParamsContract = BaseParamsWithContract;

export type DepositIndexParamsContract = BaseParamsWithContract & {
  debtAmount: BigNumber;
};

export type DrawDebtParamsContract = BaseParamsWithContract & {
  borrowerAddress: Address;
  amountToBorrow: BigNumber;
  limitIndex: number;
  collateralToPledge: BigNumber;
};

export type FactoryDeployPoolParams = BaseParams & {
  collateralAddress: Address;
  quoteAddress: Address;
  interestRate: BigNumber;
};

export type LoansInfoParamsContract = BaseParamsWithContract;

export type MoveQuoteTokenParamsContract = BaseParamsWithContract & {
  maxAmountToMove: BigNumber;
  fromIndex: number;
  toIndex: number;
  expiry: number;
};

// export type PullCollateralParamsContract = BaseParamsWithPool & {
//   collateralAmountToPull: BigNumber;
// };

// export type PullCollateralParams = BaseParams & {
//   collateralAmountToPull: BigNumber;
// };

export type PoolBucketInfoParamsContract = BaseParamsWithContract & {
  poolAddress: Address;
  index: number;
};

export type PoolIndexToPriceParamsContract = BaseParamsWithContract & {
  index: number;
};

export type PoolLpsToQuoteTokensParamsContract = BaseParamsWithContract & {
  poolAddress: Address;
  lpTokens: BigNumber;
  index: number;
};

export type PoolPriceToIndexParamsContract = BaseParamsWithContract & {
  price: BigNumber;
};

export type PoolPricesInfoParamsContract = BaseParamsWithContract & {
  poolAddress: Address;
};

export type QuoteBalanceParamsContract = {
  provider: SignerOrProvider;
  quoteAddress: Address;
  holderAddress: Address;
};

export type RemoveQuoteTokenParamsContract = BaseParamsWithContract & {
  maxAmount: BigNumber;
  bucketIndex: number;
};

export type RepayDebtParamsContract = BaseParamsWithContract & {
  borrowerAddress: Address;
  maxQuoteTokenAmountToRepay: BigNumber;
  collateralAmountToPull: BigNumber;
  collateralReceiver: Address;
  limitIndex: number;
};

export type RepayParamsContract = BaseParamsWithContract & {
  from: Address;
  amount: BigNumber;
};

export interface TransactionOverrides {
  to?: string;
  from?: string;
  value?: string;
  gasLimit?: number;
  gasPrice?: string;
  nonce?: string;
}

export interface WrappedTransaction {
  verify(): Promise<BigNumber>;
  submit(confirmations?: number): Promise<TransactionReceipt>;
  submitResponse(): Promise<TransactionResponse>;
  verifyAndSubmit(confirmations?: number): Promise<TransactionReceipt>;
  verifyAndSubmitResponse(): Promise<TransactionResponse>;
}
