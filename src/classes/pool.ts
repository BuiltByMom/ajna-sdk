import {
  AddQuoteTokenParams,
  DebtInfoParams,
  DepositIndexParams,
  GenericApproveParams,
  GetPositionParams,
  LenderInfoParams,
  LoansInfoParams,
  MoveQuoteTokenParams,
  Provider,
  RemoveQuoteTokenParams,
  SignerOrProvider,
} from '../constants/interfaces';
import {
  addQuoteToken,
  approve,
  debtInfo,
  depositIndex,
  getErc20PoolContract,
  lenderInfo,
  loansInfo,
  moveQuoteToken,
  removeQuoteToken,
} from '../contracts/erc20-pool';
import {
  getPoolInfoUtilsContract,
  getPoolInfoUtilsContractMulti,
  poolPricesInfo,
} from '../contracts/pool-info-utils';
import { toWad } from '../utils/numeric';
import { PoolUtils } from './pool-utils';
import { Contract as ContractMulti, Provider as ProviderMulti } from 'ethcall';
import { Contract } from 'ethers';

/**
 * Abstract baseclass used for pools, regardless of collateral type.
 */
class Pool {
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
    quoteAddress: string
  ) {
    this.provider = provider;
    this.poolAddress = poolAddress;
    this.contract = getErc20PoolContract(poolAddress, this.provider);
    this.contractUtils = getPoolInfoUtilsContract(provider);
    this.contractUtilsMulti = getPoolInfoUtilsContractMulti();
    this.utils = new PoolUtils(this.provider as Provider);
    this.quoteAddress = quoteAddress;
    this.collateralAddress = collateralAddress;
    this.ethcallProvider = {} as ProviderMulti;

    this.initialize().then((response) => {
      this.ethcallProvider = response;
    });
  }

  initialize = async () => {
    const ethcallProvider = new ProviderMulti();

    await ethcallProvider.init(this.provider as Provider);

    return ethcallProvider;
  };

  collateralApprove = async ({ signer, allowance }: GenericApproveParams) => {
    return await approve({
      provider: signer,
      poolAddress: this.poolAddress,
      tokenAddress: this.collateralAddress,
      allowance: toWad(allowance),
    });
  };

  quoteApprove = async ({ signer, allowance }: GenericApproveParams) => {
    return await approve({
      provider: signer,
      poolAddress: this.poolAddress,
      tokenAddress: this.quoteAddress,
      allowance: toWad(allowance),
    });
  };

  addQuoteToken = async ({
    signer,
    amount,
    bucketIndex,
  }: AddQuoteTokenParams) => {
    const contractPoolWithSigner = this.contract.connect(signer);

    return await addQuoteToken({
      contract: contractPoolWithSigner,
      amount: toWad(amount),
      bucketIndex,
    });
  };

  moveQuoteToken = async ({
    signer,
    maxAmountToMove,
    fromIndex,
    toIndex,
  }: MoveQuoteTokenParams) => {
    const contractPoolWithSigner = this.contract.connect(signer);

    return await moveQuoteToken({
      contract: contractPoolWithSigner,
      maxAmountToMove: toWad(maxAmountToMove),
      fromIndex,
      toIndex,
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
      maxAmount: toWad(maxAmount),
      bucketIndex,
    });
  };

  addLiquidity = async ({
    signer,
    amount,
    bucketIndex,
  }: AddQuoteTokenParams) => {
    return await this.addQuoteToken({
      signer,
      amount,
      bucketIndex,
    });
  };

  removeLiquidity = async ({
    signer,
    maxAmount,
    bucketIndex,
  }: RemoveQuoteTokenParams) => {
    return await this.removeQuoteToken({
      signer,
      maxAmount,
      bucketIndex,
    });
  };

  moveLiquidity = async ({
    signer,
    maxAmountToMove,
    fromIndex,
    toIndex,
  }: MoveQuoteTokenParams) => {
    return await this.moveQuoteToken({
      signer,
      maxAmountToMove,
      fromIndex,
      toIndex,
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
    withdrawalAmount,
    bucketIndex,
  }: GetPositionParams) => {
    let penaltyFee = 0;
    let insufficientLiquidityForWithdraw = false;
    const withdrawalAmountBN = toWad(withdrawalAmount);
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
      debtAmount:
        typeof debtAmount === 'number' ? toWad(debtAmount) : debtAmount,
    });
  };
}

export { Pool };
