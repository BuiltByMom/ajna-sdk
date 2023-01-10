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
  SignerOrProvider
} from '../constants/interfaces';
import {
  addQuoteToken,
  approve,
  debtInfo,
  depositIndex,
  getPoolContract,
  lenderInfo,
  loansInfo,
  moveQuoteToken,
  removeQuoteToken
} from '../contracts/get-pool-contract';
import { getPoolInfoUtilsContractMulti } from '../contracts/get-pool-info-utils-contract';
import toWei from '../utils/to-wei';
import { PoolUtils } from './pool-utils';
import { Contract as ContractMulti, Provider as ProviderMulti } from 'ethcall';
import { Contract } from 'ethers';

class Pool {
  provider: SignerOrProvider;
  contract: Contract;
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
    this.contract = getPoolContract(poolAddress, this.provider);
    this.contractUtilsMulti = getPoolInfoUtilsContractMulti();
    this.utils = new PoolUtils(this.provider as Provider, poolAddress);
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
      allowance: toWei(allowance)
    });
  };

  quoteApprove = async ({ signer, allowance }: GenericApproveParams) => {
    return await approve({
      provider: signer,
      poolAddress: this.poolAddress,
      tokenAddress: this.quoteAddress,
      allowance: toWei(allowance)
    });
  };

  addQuoteToken = async ({
    signer,
    amount,
    bucketIndex
  }: AddQuoteTokenParams) => {
    const contractPoolWithSigner = this.contract.connect(signer);

    return await addQuoteToken({
      contractPool: contractPoolWithSigner,
      amount: toWei(amount),
      bucketIndex
    });
  };

  moveQuoteToken = async ({
    signer,
    maxAmountToMove,
    fromIndex,
    toIndex
  }: MoveQuoteTokenParams) => {
    const contractPoolWithSigner = this.contract.connect(signer);

    return await moveQuoteToken({
      contractPool: contractPoolWithSigner,
      maxAmountToMove: toWei(maxAmountToMove),
      fromIndex,
      toIndex
    });
  };

  removeQuoteToken = async ({
    signer,
    maxAmount,
    bucketIndex
  }: RemoveQuoteTokenParams) => {
    const contractPoolWithSigner = this.contract.connect(signer);

    return await removeQuoteToken({
      contractPool: contractPoolWithSigner,
      maxAmount: toWei(maxAmount),
      bucketIndex
    });
  };

  addLiquidity = async ({
    signer,
    amount,
    bucketIndex
  }: AddQuoteTokenParams) => {
    return await this.addQuoteToken({
      signer,
      amount,
      bucketIndex
    });
  };

  removeLiquidity = async ({
    signer,
    maxAmount,
    bucketIndex
  }: RemoveQuoteTokenParams) => {
    return await this.removeQuoteToken({
      signer,
      maxAmount,
      bucketIndex
    });
  };

  moveLiquidity = async ({
    signer,
    maxAmountToMove,
    fromIndex,
    toIndex
  }: MoveQuoteTokenParams) => {
    return await this.moveQuoteToken({
      signer,
      maxAmountToMove,
      fromIndex,
      toIndex
    });
  };

  lenderInfo = async ({ signer, lenderAddress, index }: LenderInfoParams) => {
    const contractPoolWithSigner = this.contract.connect(signer);

    const [lpBalance, depositTime] = await lenderInfo({
      contractPool: contractPoolWithSigner,
      lenderAddress,
      index
    });

    return {
      lpBalance,
      depositTime
    };
  };

  debtInfo = async ({ signer }: DebtInfoParams) => {
    const contractPoolWithSigner = this.contract.connect(signer);

    const [poolDebt] = await debtInfo({
      contractPool: contractPoolWithSigner
    });

    return {
      poolDebt
    };
  };

  loansInfo = async ({ signer }: LoansInfoParams) => {
    const contractPoolWithSigner = this.contract.connect(signer);

    const [borrowerAddress, loan, noOfLoans] = await loansInfo({
      contractPool: contractPoolWithSigner
    });

    return {
      borrowerAddress,
      loan,
      noOfLoans
    };
  };

  getPrices = async () => {
    const { hpb, htp, lup } = await this.utils.poolPricesInfo();

    return {
      hpb,
      htp,
      lup
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
      poolUtilizationInfoCall
    ]);

    const [poolSize, loansCount] = data[0];
    const [minDebtAmount, collateralization, actualUtilization] = data[1];

    return {
      poolSize,
      loansCount,
      minDebtAmount,
      collateralization,
      actualUtilization
    };
  };

  getPosition = async ({
    signer,
    withdrawalAmount,
    bucketIndex
  }: GetPositionParams) => {
    let penaltyFee = 0;
    let insufficientLiquidityForWithdraw = false;
    const withdrawalAmountBN = toWei(withdrawalAmount);
    const pastOneDayTimestamp = Date.now() / 1000 - 24 * 3600;
    const { htpIndex } = await this.utils.poolPricesInfo();

    const { poolDebt } = await this.debtInfo({
      signer
    });

    const { lpBalance, depositTime: depositTimeBN } = await this.lenderInfo({
      signer,
      lenderAddress: await signer.getAddress(),
      index: bucketIndex
    });

    const lupIndex = await this.depositIndex({
      signer,
      debtAmount: poolDebt.add(withdrawalAmountBN)
    });

    if (lupIndex.toNumber() > htpIndex.toNumber()) {
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
      penaltyTimeRemaining: depositTime + 24 * 3600
    };
  };

  depositIndex = async ({ signer, debtAmount }: DepositIndexParams) => {
    const contractPoolWithSigner = this.contract.connect(signer);

    return await depositIndex({
      contractPool: contractPoolWithSigner,
      debtAmount:
        typeof debtAmount === 'number' ? toWei(debtAmount) : debtAmount
    });
  };
}

export { Pool };
