// import {
//   // PoolDrawDebtParams,
//   PoolRepayDebtParams
// } from '../constants/interfaces';
import { Pool } from './pool';

class FungiblePool extends Pool {
  // constructor() { }

  // drawDebt = async ({
  //   to,
  //   collateralToPledge,
  //   from,
  //   amount,
  //   bucketIndex
  // }: PoolDrawDebtParams) => {
  //   await this.pledgeCollateral({
  //     to,
  //     collateralToPledge
  //   });

  //   await this.borrow({ amount, bucketIndex, from });
  // };

  // repayDebt = async ({
  //   collateralToPledge,
  //   amount,
  //   from
  // }: PoolRepayDebtParams) => {
  //   await this.repay({
  //     amount,
  //     from
  //   });

  //   await this.pullCollateral({ collateralToPledge, from });
  // };

  getLoan = async () => {
    return null;
  };

  getBuckets = async () => {
    return null;
  };
}

export { FungiblePool };
