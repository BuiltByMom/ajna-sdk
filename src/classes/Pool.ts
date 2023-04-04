import { multicall } from '../contracts/common';
import { Contract as ContractMulti, Provider as ProviderMulti } from 'ethcall';
import { BigNumber, Contract, Signer, constants } from 'ethers';
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
import { Address, CallData, Provider, SignerOrProvider } from '../types';
import { getExpiry } from '../utils/time';
import { PoolUtils } from './PoolUtils';

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

  async initialize() {
    this.ethcallProvider = new ProviderMulti();
    await this.ethcallProvider.init(this.provider as Provider);
  }

  async quoteApprove(signer: Signer, allowance: BigNumber) {
    return await approve(signer, this.poolAddress, this.quoteAddress, allowance);
  }

  async addQuoteToken(signer: Signer, bucketIndex: number, amount: BigNumber, ttlSeconds?: number) {
    const contractPoolWithSigner = this.contract.connect(signer);

    return await addQuoteToken(
      contractPoolWithSigner,
      amount,
      bucketIndex,
      await getExpiry(this.provider, ttlSeconds)
    );
  }

  async moveQuoteToken(
    signer: Signer,
    fromIndex: number,
    toIndex: number,
    maxAmountToMove = constants.MaxUint256,
    ttlSeconds?: number
  ) {
    const contractPoolWithSigner = this.contract.connect(signer);

    return await moveQuoteToken(
      contractPoolWithSigner,
      maxAmountToMove,
      fromIndex,
      toIndex,
      await getExpiry(this.provider, ttlSeconds)
    );
  }

  async removeQuoteToken(signer: Signer, bucketIndex: number, maxAmount = constants.MaxUint256) {
    const contractPoolWithSigner = this.contract.connect(signer);

    return await removeQuoteToken(contractPoolWithSigner, maxAmount, bucketIndex);
  }

  async lenderInfo(signer: Signer, lenderAddress: Address, index: number) {
    const contractPoolWithSigner = this.contract.connect(signer);

    const [lpBalance, depositTime] = await lenderInfo(contractPoolWithSigner, lenderAddress, index);

    return {
      lpBalance,
      depositTime,
    };
  }

  async debtInfo(signer: Signer) {
    const contractPoolWithSigner = this.contract.connect(signer);

    const [poolDebt] = await debtInfo(contractPoolWithSigner);

    return {
      poolDebt,
    };
  }

  async loansInfo(signer: Signer) {
    const contractPoolWithSigner = this.contract.connect(signer);

    const [borrowerAddress, loan, noOfLoans] = await loansInfo(contractPoolWithSigner);

    return {
      borrowerAddress,
      loan,
      noOfLoans,
    };
  }

  async getPrices() {
    const [hpb, htp, lup] = await poolPricesInfo(this.contractUtils, this.poolAddress);

    return {
      hpb,
      htp,
      lup,
    };
  }

  async getStats() {
    const poolLoansInfoCall = this.contractUtilsMulti.poolLoansInfo(this.poolAddress);
    const poolUtilizationInfoCall = this.contractUtilsMulti.poolUtilizationInfo(this.poolAddress);
    const data: string[] = await this.ethcallProvider.all([
      poolLoansInfoCall,
      poolUtilizationInfoCall,
    ]);

    const [poolSize, loansCount] = data[0];
    const [minDebtAmount, collateralization, actualUtilization, targetUtilization] = data[1];

    return {
      poolSize: BigNumber.from(poolSize),
      loansCount: BigNumber.from(loansCount),
      minDebtAmount: BigNumber.from(minDebtAmount),
      collateralization: BigNumber.from(collateralization),
      actualUtilization: BigNumber.from(actualUtilization),
      targetUtilization: BigNumber.from(targetUtilization),
    };
  }

  async getPosition(signer: Signer, bucketIndex: number, proposedWithdrawal?: BigNumber) {
    let penaltyFee = 0;
    let insufficientLiquidityForWithdraw = false;
    const withdrawalAmountBN = proposedWithdrawal ?? BigNumber.from(0);
    const pastOneDayTimestamp = Date.now() / 1000 - 24 * 3600;
    const [, , , htpIndex, ,] = await poolPricesInfo(this.contractUtils, this.poolAddress);

    const { poolDebt } = await this.debtInfo(signer);

    const { lpBalance, depositTime: depositTimeBN } = await this.lenderInfo(
      signer,
      await signer.getAddress(),
      bucketIndex
    );

    const lupIndexAfterWithdrawal = await this.depositIndex(
      signer,
      poolDebt.add(withdrawalAmountBN)
    );

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
  }

  async depositIndex(signer: Signer, debtAmount: BigNumber) {
    const contractPoolWithSigner = this.contract.connect(signer);

    return await depositIndex(contractPoolWithSigner, debtAmount);
  }

  async multicall(signer: Signer, callData: Array<CallData>) {
    const contractPoolWithSigner = this.contract.connect(signer);

    return await multicall(contractPoolWithSigner, callData);
  }

  async getIndexesPriceByRange(minPrice: BigNumber, maxPrice: BigNumber) {
    const minIndexCall = this.contractUtilsMulti.priceToIndex(minPrice);
    const maxIndexCall = this.contractUtilsMulti.priceToIndex(maxPrice);
    const response: BigNumber[][] = await this.ethcallProvider.all([minIndexCall, maxIndexCall]);

    const minIndex = response[0];
    const maxIndex = response[1];

    const indexToPriceCalls = [];

    for (let index = Number(maxIndex.toString()); index <= Number(minIndex.toString()); index++) {
      indexToPriceCalls.push(this.contractUtilsMulti.indexToPrice(index));
    }

    const responseCalls: BigNumber[] = await this.ethcallProvider.all(indexToPriceCalls);

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

    return buckets.filter(element => !!element);
  }
}

export { Pool };
