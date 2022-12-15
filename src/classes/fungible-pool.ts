import {
  DrawDebtParams,
  Erc20Address,
  RepayDebtParams
} from '../constants/interfaces';
import { drawDebt, repayDebt } from '../contracts/get-pool-contract';
import toWei from '../utils/to-wei';
import { Pool } from './pool';

class FungiblePool extends Pool {
  buckets: unknown[] = [];

  drawDebt = async ({
    signer,
    borrowerAddress,
    amountToBorrow,
    limitIndex,
    collateralToPledge
  }: DrawDebtParams) => {
    const contractPoolWithSigner = this.contract.connect(signer);

    return await drawDebt({
      contractPool: contractPoolWithSigner,
      borrowerAddress,
      amountToBorrow: toWei(amountToBorrow),
      limitIndex,
      collateralToPledge: toWei(collateralToPledge)
    });
  };

  repayDebt = async ({
    signer,
    collateralAmountToPull,
    maxQuoteTokenAmountToRepay
  }: RepayDebtParams) => {
    const contractPoolWithSigner = this.contract.connect(signer);

    return await repayDebt({
      contractPool: contractPoolWithSigner,
      borrowerAddress: await signer.getAddress(),
      collateralAmountToPull: toWei(collateralAmountToPull),
      maxQuoteTokenAmountToRepay: toWei(maxQuoteTokenAmountToRepay)
    });
  };

  getLoan = async (borrowerAddress: Erc20Address) => {
    const [, , , , lup] = await this.utils.poolPricesInfo(this.poolAddress);
    const [debt, collateral] = await this.utils.borrowerInfo(
      borrowerAddress,
      this.poolAddress
    );

    return collateral.mul(lup).div(debt);
  };
}

export { FungiblePool };
