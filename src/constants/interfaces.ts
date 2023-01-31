import { BigNumberish, Contract, Signer, providers } from 'ethers';

export type SignerOrProvider = Signer | providers.Provider;

export type Provider = providers.Provider;

export type Address = string;

export type CollateralAddress = Address;

export type QuoteAddress = Address;

type BaseParams = {
  signer: Signer;
};

type BaseParamsWithPool = {
  contractPool: Contract;
};

export type GenericApproveParamsContract = {
  provider: SignerOrProvider;
  poolAddress: Address;
  allowance: BigNumberish;
  tokenAddress: CollateralAddress | QuoteAddress;
};

export type GenericApproveParams = BaseParams & {
  allowance: number;
};

export type DrawDebtParamsContract = BaseParamsWithPool & {
  borrowerAddress: Address;
  amountToBorrow: BigNumberish;
  collateralToPledge: BigNumberish;
  limitIndex: number;
};

export type DrawDebtParams = BaseParams & {
  borrowerAddress: Address;
  amountToBorrow: number;
  limitIndex: number;
  collateralToPledge: number;
};

export type RepayDebtParamsContract = BaseParamsWithPool & {
  borrowerAddress: Address;
  collateralAmountToPull: BigNumberish;
  maxQuoteTokenAmountToRepay: BigNumberish;
};

export type RepayDebtParams = BaseParams & {
  collateralAmountToPull: number;
  maxQuoteTokenAmountToRepay: number;
};

export type AddQuoteTokenParamsContract = BaseParamsWithPool & {
  amount: BigNumberish;
  bucketIndex: number;
};

export type AddQuoteTokenParams = BaseParams & {
  amount: number;
  bucketIndex: number;
};

export type RemoveQuoteTokenParamsContract = BaseParamsWithPool & {
  maxAmount: BigNumberish;
  bucketIndex: number;
};

export type LenderInfoParamsContract = BaseParamsWithPool & {
  index: number;
  lenderAddress: Address;
};

export type DebtInfoParamsContract = BaseParamsWithPool;

export type LoansInfoParamsContract = BaseParamsWithPool;

export type DepositIndexParamsContract = BaseParamsWithPool & {
  debtAmount: BigNumberish;
};

export type RemoveQuoteTokenParams = BaseParams & {
  maxAmount: number;
  bucketIndex: number;
};

export type MoveQuoteTokenParamsContract = BaseParamsWithPool & {
  maxAmountToMove: BigNumberish;
  fromIndex: number;
  toIndex: number;
};

export type MoveQuoteTokenParams = BaseParams & {
  maxAmountToMove: number;
  fromIndex: number;
  toIndex: number;
};

export type LenderInfoParams = BaseParams & {
  index: number;
  lenderAddress: Address;
};
export type DebtInfoParams = BaseParams;

export type LoansInfoParams = BaseParams;

export type DepositIndexParams = BaseParams & {
  debtAmount: number | BigNumberish;
};

export type GetPositionParams = BaseParams & {
  bucketIndex: number;
  withdrawalAmount: number;
};

export type QuoteBalanceParamsContract = {
  provider: SignerOrProvider;
  quoteAddress: Address;
  holderAddress: Address;
};

export type CollateralBalanceParamsContract = {
  provider: SignerOrProvider;
  collateralAddress: Address;
  holderAddress: Address;
};

export type RepayParamsContract = BaseParamsWithPool & {
  from: Address;
  amount: BigNumberish;
};

export type RepayParams = BaseParams & {
  amount: BigNumberish;
};

// export type PullCollateralParamsContract = BaseParamsWithPool & {
//   collateralAmountToPull: BigNumberish;
// };

// export type PullCollateralParams = BaseParams & {
//   collateralAmountToPull: BigNumberish;
// };

export type FactoryDeployPoolParams = BaseParams & {
  collateralAddress: Address;
  quoteAddress: Address;
  interestRate: string;
};

export type BorrowerInfoParamsContract = BaseParamsWithPool & {
  poolAddress: Address;
  borrowerAddress: Address;
};

export type PoolPricesInfoParamsContract = BaseParamsWithPool & {
  poolAddress: Address;
};

export type PoolPriceToIndexParamsContract = BaseParamsWithPool & {
  price: BigNumberish;
};

export type PoolBucketInfoParamsContract = BaseParamsWithPool & {
  poolAddress: Address;
  index: number;
};

export type PoolLpsToQuoteTokensParamsContract = BaseParamsWithPool & {
  poolAddress: Address;
  lpTokens: number;
  index: number;
};

export type PoolIndexToPriceParamsContract = BaseParamsWithPool & {
  index: number;
};

export type EstimateLoanParams = BaseParams & {
  debtAmount: number;
  collateralAmount: number;
};
