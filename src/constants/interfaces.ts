import { BigNumberish, Contract, Signer, providers } from 'ethers';

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
  allowance: BigNumberish;
  tokenAddress: CollateralAddress | QuoteAddress;
};

export type GenericApproveParams = BaseParams & {
  allowance: number;
};

export type DrawDebtParamsContract = BaseParamsWithContract & {
  borrowerAddress: Address;
  amountToBorrow: BigNumberish;
  collateralToPledge: BigNumberish;
  limitIndex: number;
};

export type DrawDebtParams = BaseParams & {
  borrowerAddress: Address;
  amountToBorrow: BigNumberish;
  limitIndex: number;
  collateralToPledge: BigNumberish;
};

export type RepayDebtParamsContract = BaseParamsWithContract & {
  borrowerAddress: Address;
  collateralAmountToPull: BigNumberish;
  maxQuoteTokenAmountToRepay: BigNumberish;
};

export type RepayDebtParams = BaseParams & {
  collateralAmountToPull: BigNumberish;
  maxQuoteTokenAmountToRepay: BigNumberish;
};

export type AddQuoteTokenParamsContract = BaseParamsWithContract & {
  amount: BigNumberish;
  bucketIndex: number;
};

export type AddQuoteTokenParams = BaseParams & {
  amount: BigNumberish;
  bucketIndex: number;
};

export type RemoveQuoteTokenParamsContract = BaseParamsWithContract & {
  maxAmount: BigNumberish;
  bucketIndex: number;
};

export type LenderInfoParamsContract = BaseParamsWithContract & {
  index: number;
  lenderAddress: Address;
};

export type DebtInfoParamsContract = BaseParamsWithContract;

export type LoansInfoParamsContract = BaseParamsWithContract;

export type DepositIndexParamsContract = BaseParamsWithContract & {
  debtAmount: BigNumberish;
};

export type RemoveQuoteTokenParams = BaseParams & {
  maxAmount: BigNumberish;
  bucketIndex: number;
};

export type MoveQuoteTokenParamsContract = BaseParamsWithContract & {
  maxAmountToMove: BigNumberish;
  fromIndex: number;
  toIndex: number;
};

export type MoveQuoteTokenParams = BaseParams & {
  maxAmountToMove: BigNumberish;
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
  withdrawalAmount: BigNumberish;
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

export type RepayParamsContract = BaseParamsWithContract & {
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
  interestRate: BigNumberish;
};

export type BorrowerInfoParamsContract = BaseParamsWithContract & {
  poolAddress: Address;
  borrowerAddress: Address;
};

export type PoolPricesInfoParamsContract = BaseParamsWithContract & {
  poolAddress: Address;
};

export type PoolPriceToIndexParamsContract = BaseParamsWithContract & {
  price: BigNumberish;
};

export type PoolBucketInfoParamsContract = BaseParamsWithContract & {
  poolAddress: Address;
  index: number;
};

export type PoolLpsToQuoteTokensParamsContract = BaseParamsWithContract & {
  poolAddress: Address;
  lpTokens: BigNumberish;
  index: number;
};

export type PoolIndexToPriceParamsContract = BaseParamsWithContract & {
  index: number;
};

export type EstimateLoanParams = BaseParams & {
  debtAmount: BigNumberish;
  collateralAmount: BigNumberish;
};
