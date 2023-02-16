import {
  Address,
  DrawDebtParams,
  EstimateLoanParams,
  RepayDebtParams,
} from '../constants/interfaces';
import { drawDebt, repayDebt } from '../contracts/erc20-pool';
import { toWad } from '../utils/numeric';
import { priceToIndex } from '../utils/pricing';
import { Bucket } from './bucket';
import { Pool } from './pool';
import { BigNumber } from 'ethers';

class FungiblePool extends Pool {
  drawDebt = async ({
    signer,
    borrowerAddress,
    amountToBorrow,
    limitIndex,
    collateralToPledge,
  }: DrawDebtParams) => {
    const contractPoolWithSigner = this.contract.connect(signer);

    const estimateLoan = await this.estimateLoan({
      signer,
      debtAmount: amountToBorrow,
      collateralAmount: collateralToPledge,
    });

    if (!estimateLoan.canBorrow) {
      throw new Error('ERR_BORROWER_UNCOLLATERALIZED');
    }

    return await drawDebt({
      contract: contractPoolWithSigner,
      borrowerAddress,
      amountToBorrow: toWad(amountToBorrow),
      limitIndex,
      collateralToPledge: toWad(collateralToPledge),
    });
  };

  repayDebt = async ({
    signer,
    collateralAmountToPull,
    maxQuoteTokenAmountToRepay,
  }: RepayDebtParams) => {
    const contractPoolWithSigner = this.contract.connect(signer);

    return await repayDebt({
      contract: contractPoolWithSigner,
      borrowerAddress: await signer.getAddress(),
      collateralAmountToPull: toWad(collateralAmountToPull),
      maxQuoteTokenAmountToRepay: toWad(maxQuoteTokenAmountToRepay),
    });
  };

  getLoan = async (borrowerAddress: Address) => {
    const poolPricesInfoCall = this.contractUtilsMulti.poolPricesInfo(
      this.poolAddress
    );
    const borrowerInfoCall = this.contractUtilsMulti.borrowerInfo(
      this.poolAddress,
      borrowerAddress
    );

    const response: BigNumber[][] = await this.ethcallProvider.all([
      poolPricesInfoCall,
      borrowerInfoCall,
    ]);

    const [, , , , lup] = response[0];
    const [debt, collateral] = response[1];
    const collateralization = debt.gt(0)
      ? collateral.mul(lup).div(debt)
      : BigNumber.from(1);
    const tp = collateral.gt(0) ? debt.div(collateral) : BigNumber.from(0);

    return {
      collateralization: collateralization,
      debt,
      collateral,
      thresholdPrice: tp,
    };
  };

  getIndexesPriceByRange = async (minPrice: number, maxPrice: number) => {
    const minIndexCall = this.contractUtilsMulti.priceToIndex(toWad(minPrice));
    const maxIndexCall = this.contractUtilsMulti.priceToIndex(toWad(maxPrice));
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

  getBucketByIndex = async (bucketIndex: number) => {
    const bucket = new Bucket(this.provider, this.poolAddress, bucketIndex);

    try {
      await bucket.initialize();
    } catch (error: unknown) {
      // TODO: can we just rethrow error here instead of wrapping?
      if ((error as string).search('network') !== -1) {
        throw new Error('ERR_NETWORK');
      }
    }

    return bucket;
  };

  getBucketByPrice = async (price: BigNumber) => {
    const bucketIndex = priceToIndex(price);
    // priceToIndex should throw upon invalid price
    const bucket = new Bucket(this.provider, this.poolAddress, bucketIndex);
    await bucket.initialize();
    return bucket;
  };

  estimateLoan = async ({
    signer,
    debtAmount,
    collateralAmount,
  }: EstimateLoanParams) => {
    const poolPricesInfoCall = this.contractUtilsMulti.poolPricesInfo(
      this.poolAddress
    );
    const borrowerInfoCall = this.contractUtilsMulti.borrowerInfo(
      this.poolAddress,
      await signer.getAddress()
    );

    const response: BigNumber[][] = await this.ethcallProvider.all([
      poolPricesInfoCall,
      borrowerInfoCall,
    ]);

    const [, , , , lup] = response[0];
    const [debt, collateral] = response[1];

    const { poolDebt } = await this.debtInfo({
      signer,
    });

    const lupIndex = await this.depositIndex({
      signer,
      debtAmount: poolDebt.add(toWad(debtAmount)),
    });

    const thresholdPrice = debt
      .add(toWad(debtAmount))
      .div(collateral.add(collateralAmount));

    return {
      lupIndex: lupIndex.toNumber(),
      thresholdPrice,
      canBorrow: thresholdPrice.lt(lup),
    };
  };
}

export { FungiblePool };
