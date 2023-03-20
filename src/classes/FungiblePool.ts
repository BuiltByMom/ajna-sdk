import { MAX_FENWICK_INDEX } from '../constants';
import { approve, drawDebt, getErc20PoolContract, repayDebt } from '../contracts/erc20-pool';
import { Address, SignerOrProvider } from '../types';
import { priceToIndex } from '../utils/pricing';
import { Bucket } from './Bucket';
import { Pool } from './Pool';
import { BigNumber, Signer } from 'ethers';

class FungiblePool extends Pool {
  constructor(
    provider: SignerOrProvider,
    poolAddress: string,
    collateralAddress: string,
    quoteAddress: string
  ) {
    super(
      provider,
      poolAddress,
      collateralAddress,
      quoteAddress,
      getErc20PoolContract(poolAddress, provider)
    );
    this.initialize();
  }

  collateralApprove = async (signer: Signer, allowance: BigNumber) => {
    return await approve(signer, this.poolAddress, this.collateralAddress, allowance);
  };

  drawDebt = async (
    signer: Signer,
    amountToBorrow: BigNumber,
    limitIndex: number | null,
    collateralToPledge: BigNumber
  ) => {
    const contractPoolWithSigner = this.contract.connect(signer);

    const estimateLoan = await this.estimateLoan(signer, amountToBorrow, collateralToPledge);

    if (!estimateLoan.canBorrow) {
      throw new Error('ERR_BORROWER_UNCOLLATERALIZED');
    }

    return await drawDebt(
      contractPoolWithSigner,
      await signer.getAddress(),
      amountToBorrow,
      limitIndex ?? MAX_FENWICK_INDEX,
      collateralToPledge
    );
  };

  repayDebt = async (
    signer: Signer,
    maxQuoteTokenAmountToRepay: BigNumber,
    collateralAmountToPull: BigNumber,
    limitIndex: number | null
  ) => {
    const contractPoolWithSigner = this.contract.connect(signer);

    const sender = await signer.getAddress();
    return await repayDebt(
      contractPoolWithSigner,
      sender,
      maxQuoteTokenAmountToRepay,
      collateralAmountToPull,
      sender,
      limitIndex ?? MAX_FENWICK_INDEX
    );
  };

  getLoan = async (borrowerAddress: Address) => {
    const poolPricesInfoCall = this.contractUtilsMulti.poolPricesInfo(this.poolAddress);
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
    const collateralization = debt.gt(0) ? collateral.mul(lup).div(debt) : BigNumber.from(1);
    const tp = collateral.gt(0) ? debt.div(collateral) : BigNumber.from(0);

    return {
      collateralization: collateralization,
      debt,
      collateral,
      thresholdPrice: tp,
    };
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

  estimateLoan = async (signer: Signer, debtAmount: BigNumber, collateralAmount: BigNumber) => {
    const poolPricesInfoCall = this.contractUtilsMulti.poolPricesInfo(this.poolAddress);
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

    const { poolDebt } = await this.debtInfo(signer);

    const lupIndex = await this.depositIndex(signer, poolDebt.add(debtAmount));

    const thresholdPrice = debt.add(debtAmount).div(collateral.add(collateralAmount));

    return {
      lupIndex: lupIndex.toNumber(),
      thresholdPrice,
      canBorrow: thresholdPrice.lt(lup),
    };
  };
}

export { FungiblePool };
