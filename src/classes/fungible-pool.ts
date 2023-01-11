import {
  DrawDebtParams,
  Erc20Address,
  RepayDebtParams,
} from '../constants/interfaces';
import { drawDebt, repayDebt } from '../contracts/get-pool-contract';
// import priceToIndex from '../utils/price-to-index';
import toWei from '../utils/to-wei';
import { Pool } from './pool';
import { BigNumber } from 'ethers';

type GetBucketByIndexObject = {
  index?: number;
  price: BigNumber;
};

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
      contractPool: contractPoolWithSigner,
      borrowerAddress,
      amountToBorrow: toWei(amountToBorrow),
      limitIndex,
      collateralToPledge: toWei(collateralToPledge),
    });
  };

  repayDebt = async ({
    signer,
    collateralAmountToPull,
    maxQuoteTokenAmountToRepay,
  }: RepayDebtParams) => {
    const contractPoolWithSigner = this.contract.connect(signer);

    return await repayDebt({
      contractPool: contractPoolWithSigner,
      borrowerAddress: await signer.getAddress(),
      collateralAmountToPull: toWei(collateralAmountToPull),
      maxQuoteTokenAmountToRepay: toWei(maxQuoteTokenAmountToRepay),
    });
  };

  getLoan = async (borrowerAddress: Erc20Address) => {
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

    return {
      collateralization: collateral.mul(lup).div(debt),
      debt,
      collateral,
      thresholdPrice: debt.div(collateral),
    };
  };

  getIndexesPriceByRange = async (minPrice: number, maxPrice: number) => {
    const minIndexCall = this.contractUtilsMulti.priceToIndex(toWei(minPrice));
    const maxIndexCall = this.contractUtilsMulti.priceToIndex(toWei(maxPrice));
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
    let info = {
      index: bucketIndex,
    } as GetBucketByIndexObject;

    try {
      info = await this.utils.bucketInfo(bucketIndex);

      if (!info) {
        throw new Error('ERR_BUCKET_INDEX_NOT_FOUND');
      }

      info.price = await this.utils.indexToPrice(bucketIndex);
    } catch (error: unknown) {
      if ((error as string).search('network') !== -1) {
        throw new Error('ERR_NETWORK');
      }
    }

    return info;
  };

  getBucketByPrice = async (price: number) => {
    let info = {} as GetBucketByIndexObject;

    try {
      info.index = await this.utils.priceToIndex(price);

      if (info.index) {
        info = await this.utils.bucketInfo(info.index);
      } else {
        return new Error('ERR_BUCKET_INDEX_NOT_FOUND');
      }
    } catch (error: unknown) {
      if ((error as string).search('network') !== -1) {
        throw new Error('ERR_NETWORK');
      }
    }

    return info;
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
      debtAmount: poolDebt.add(toWei(debtAmount)),
    });

    const thresholdPrice = debt
      .add(toWei(debtAmount))
      .div(collateral.add(collateralAmount));

    return {
      lupIndex: lupIndex.toNumber(),
      thresholdPrice,
      canBorrow: thresholdPrice.lt(lup),
    };
  };
}

export { FungiblePool };
