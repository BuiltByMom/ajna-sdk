import {
  AddQuoteTokenParams,
  DebtInfoParams,
  DepositIndexParams,
  GenericApproveParams,
  GetIndexesPriceByRangeParams,
  GetPositionParams,
  LenderInfoParams,
  LoansInfoParams,
  MoveQuoteTokenParams,
  Provider,
  RemoveQuoteTokenParams,
  SignerOrProvider,
} from '../types';
import { approve } from '../contracts/erc20-pool';
import {
  addQuoteToken,
  debtInfo,
  depositIndex,
  lenderInfo,
  loansInfo,
  moveQuoteToken,
  removeQuoteToken,
} from '../contracts/pool';
import {
  getPoolInfoUtilsContract,
  getPoolInfoUtilsContractMulti,
  poolPricesInfo,
} from '../contracts/pool-info-utils';
import { getExpiry } from '../utils/time';
import { PoolUtils } from './pool-utils';
import { Contract as ContractMulti, Provider as ProviderMulti } from 'ethcall';
import { BigNumber, Contract } from 'ethers';

/**
 * Abstract baseclass used for pools, regardless of collateral type.
 */
abstract class Pool {
  provider: SignerOrProvider;
  contract: Contract;
  contractUtils: Contract;
  contractUtilsMulti: ContractMulti;
  poolAddress: string;
  quoteAddress: string;
  collateralAddress: string;
  utils: PoolUtils;
  ethcallProvider: ProviderMulti;

  constructor(
    provider: SignerOrProvider,
    poolAddress: string,
    collateralAddress: string,
    quoteAddress: string,
    contract: Contract
  ) {
    this.provider = provider;
    this.poolAddress = poolAddress;
    this.contractUtils = getPoolInfoUtilsContract(provider);
    this.contractUtilsMulti = getPoolInfoUtilsContractMulti();
    this.utils = new PoolUtils(provider as Provider);
    this.quoteAddress = quoteAddress;
    this.collateralAddress = collateralAddress;
    this.ethcallProvider = {} as ProviderMulti;
    this.contract = contract;
  }

  initialize = async () => {
    this.ethcallProvider = new ProviderMulti();
    await this.ethcallProvider.init(this.provider as Provider);
  };

  quoteApprove = async ({ signer, allowance }: GenericApproveParams) => {
    return await approve({
      provider: signer,
      poolAddress: this.poolAddress,
      tokenAddress: this.quoteAddress,
      allowance: allowance,
    });
  };

  addQuoteToken = async ({
    signer,
    amount,
    bucketIndex,
    ttlSeconds,
  }: AddQuoteTokenParams) => {
    const contractPoolWithSigner = this.contract.connect(signer);

    return await addQuoteToken({
      contract: contractPoolWithSigner,
      amount: amount,
      bucketIndex,
      expiry: await getExpiry(this.provider, ttlSeconds),
    });
  };

  moveQuoteToken = async ({
    signer,
    maxAmountToMove,
    fromIndex,
    toIndex,
    ttlSeconds,
  }: MoveQuoteTokenParams) => {
    const contractPoolWithSigner = this.contract.connect(signer);

    return await moveQuoteToken({
      contract: contractPoolWithSigner,
      maxAmountToMove: maxAmountToMove,
      fromIndex,
      toIndex,
      expiry: await getExpiry(this.provider, ttlSeconds),
    });
  };

  removeQuoteToken = async ({
    signer,
    maxAmount,
    bucketIndex,
  }: RemoveQuoteTokenParams) => {
    const contractPoolWithSigner = this.contract.connect(signer);

    return await removeQuoteToken({
      contract: contractPoolWithSigner,
      maxAmount: maxAmount,
      bucketIndex,
    });
  };

  lenderInfo = async ({ signer, lenderAddress, index }: LenderInfoParams) => {
    const contractPoolWithSigner = this.contract.connect(signer);

    const [lpBalance, depositTime] = await lenderInfo({
      contract: contractPoolWithSigner,
      lenderAddress,
      index,
    });

    return {
      lpBalance,
      depositTime,
    };
  };

  debtInfo = async ({ signer }: DebtInfoParams) => {
    const contractPoolWithSigner = this.contract.connect(signer);

    const [poolDebt] = await debtInfo({
      contract: contractPoolWithSigner,
    });

    return {
      poolDebt,
    };
  };

  loansInfo = async ({ signer }: LoansInfoParams) => {
    const contractPoolWithSigner = this.contract.connect(signer);

    const [borrowerAddress, loan, noOfLoans] = await loansInfo({
      contract: contractPoolWithSigner,
    });

    return {
      borrowerAddress,
      loan,
      noOfLoans,
    };
  };

  getPrices = async () => {
    const [hpb, htp, lup] = await poolPricesInfo({
      contract: this.contractUtils,
      poolAddress: this.poolAddress,
    });

    return {
      hpb,
      htp,
      lup,
    };
  };

  getStats = async () => {
    const poolLoansInfoCall = this.contractUtilsMulti.poolLoansInfo(
      this.poolAddress
    );
    const poolUtilizationInfoCall = this.contractUtilsMulti.poolUtilizationInfo(
      this.poolAddress
    );
    const data: string[] = await this.ethcallProvider.all([
      poolLoansInfoCall,
      poolUtilizationInfoCall,
    ]);

    const [poolSize, loansCount] = data[0];
    const [
      minDebtAmount,
      collateralization,
      actualUtilization,
      targetUtilization,
    ] = data[1];

    return {
      poolSize,
      loansCount,
      minDebtAmount,
      collateralization,
      actualUtilization,
      targetUtilization,
    };
  };

  getPosition = async ({
    signer,
    bucketIndex,
    proposedWithdrawal,
  }: GetPositionParams) => {
    let penaltyFee = 0;
    let insufficientLiquidityForWithdraw = false;
    const withdrawalAmountBN = proposedWithdrawal ?? BigNumber.from(0);
    const pastOneDayTimestamp = Date.now() / 1000 - 24 * 3600;
    const [, , , htpIndex, ,] = await poolPricesInfo({
      contract: this.contractUtils,
      poolAddress: this.poolAddress,
    });

    const { poolDebt } = await this.debtInfo({
      signer,
    });

    const { lpBalance, depositTime: depositTimeBN } = await this.lenderInfo({
      signer,
      lenderAddress: await signer.getAddress(),
      index: bucketIndex,
    });

    const lupIndexAfterWithdrawal = await this.depositIndex({
      signer,
      debtAmount: poolDebt.add(withdrawalAmountBN),
    });

    if (lupIndexAfterWithdrawal.toNumber() > htpIndex.toNumber()) {
      insufficientLiquidityForWithdraw = true;
    }

    const depositTime = Number(depositTimeBN.toString());

    // Calculate the past 24hours and check if bigger timestamp than depositTime
    if (pastOneDayTimestamp > depositTime) {
      // TODO: Calculate penalty _feeRate??? but will come from contract.
      penaltyFee = 0.0001;
    }

    return {
      insufficientLiquidityForWithdraw,
      lpBalance,
      penaltyFee,
      penaltyTimeRemaining: depositTime + 24 * 3600,
    };
  };

  depositIndex = async ({ signer, debtAmount }: DepositIndexParams) => {
    const contractPoolWithSigner = this.contract.connect(signer);

    return await depositIndex({
      contract: contractPoolWithSigner,
      debtAmount: debtAmount,
    });
  };

  getIndexesPriceByRange = async ({
    minPrice,
    maxPrice,
  }: GetIndexesPriceByRangeParams) => {
    const minIndexCall = this.contractUtilsMulti.priceToIndex(minPrice);
    const maxIndexCall = this.contractUtilsMulti.priceToIndex(maxPrice);
    const response: BigNumber[][] = await this.ethcallProvider.all([
      minIndexCall,
      maxIndexCall,
    ]);

    const minIndex = response[0];
    const maxIndex = response[1];

    const indexToPriceCalls = [];

    for (
      let index = Number(maxIndex.toString());
      index <= Number(minIndex.toString());
      index++
    ) {
      indexToPriceCalls.push(this.contractUtilsMulti.indexToPrice(index));
    }

    const responseCalls: BigNumber[] = await this.ethcallProvider.all(
      indexToPriceCalls
    );

    const buckets: { index: number; price: BigNumber }[] = [];
    let index = Number(maxIndex.toString());

    responseCalls.forEach((price, ix) => {
      const swiftIndex = index + ix;

      buckets[swiftIndex] = {
        index: swiftIndex,
        price,
      };

      index = swiftIndex;
    });

    return buckets.filter((element) => {
      return element !== null;
    });
  };
}

export { Pool };
