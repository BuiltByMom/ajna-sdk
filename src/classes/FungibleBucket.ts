import { BigNumber, Signer, constants } from 'ethers';
import { Bucket, BucketStatus, Position } from './Bucket';
import { Pool } from './Pool';

import { Address, CallData, SdkError, SignerOrProvider } from '../types';
import { toWad, wmul } from '../utils/numeric';
import { bucketInfo } from '../contracts/pool-info-utils';

/**
 * models a price bucket in a pool with ERC-20 collateral
 */
export class FungibleBucket extends Bucket {
  /**
   * @param provider JSON-RPC endpoint.
   * @param pool     Pool to which this bucket belongs.
   * @param index    Price bucket index.
   */
  constructor(provider: SignerOrProvider, pool: Pool, index: number) {
    super(provider, pool, index);
  }

  toString() {
    // return 'Fungibile bucket #' + this.index;
    return super.toString();
  }

  /**
   * retrieve current state of the bucket.
   * @returns {@link BucketStatus}
   */
  async getStatus(): Promise<BucketStatus> {
    const [, deposit, collateral, bucketLP, , exchangeRate] = await bucketInfo(
      this.contractUtils,
      this.poolContract.address,
      this.index
    );

    return {
      deposit,
      collateral,
      bucketLP,
      exchangeRate,
    };
  }

  /**
   * shows a lender's position in a single bucket
   * @returns {@link Position}
   */
  async getPosition(lenderAddress: Address): Promise<Position> {
    // pool contract multicall to find pending debt and LPB
    let data: string[] = await this.pool.ethcallProvider.all([
      this.pool.contractMulti.debtInfo(),
      this.pool.contractMulti.lenderInfo(this.index, lenderAddress),
    ]);
    const lpBalance = BigNumber.from(data[1][0]);

    // info contract multicall to get htp and calculate token amounts for LPB
    const pricesInfoCall = this.pool.contractUtilsMulti.poolPricesInfo(this.poolContract.address);
    const lpToQuoteCall = this.pool.contractUtilsMulti.lpToQuoteTokens(
      this.poolContract.address,
      lpBalance,
      this.index
    );
    const lpToCollateralCall = this.pool.contractUtilsMulti.lpToCollateral(
      this.poolContract.address,
      lpBalance,
      this.index
    );
    data = await this.pool.ethcallProvider.all([pricesInfoCall, lpToQuoteCall, lpToCollateralCall]);
    const htpIndex = +data[0][3];
    const lupIndex = +data[0][5];
    const depositRedeemable = BigNumber.from(data[1]);
    const collateralRedeemable = BigNumber.from(data[2]);

    let depositWithdrawable;
    if (this.index > lupIndex) {
      // if withdrawing below the LUP (higher index), the withdrawal cannot affect the LUP
      depositWithdrawable = depositRedeemable;
    } else {
      let liquidityBetweenLupAndHtp = toWad(0);
      // if pool is collateralized (LUP above HTP), find debt between current LUP and HTP
      if (lupIndex < htpIndex) {
        data = await this.pool.ethcallProvider.all([
          this.pool.contractMulti.depositUpToIndex(lupIndex),
          this.pool.contractMulti.depositUpToIndex(htpIndex),
        ]);
        liquidityBetweenLupAndHtp = BigNumber.from(data[1]).sub(BigNumber.from(data[0]));
      }
      depositWithdrawable = liquidityBetweenLupAndHtp.lt(depositRedeemable)
        ? liquidityBetweenLupAndHtp
        : depositRedeemable;
    }

    return {
      lpBalance,
      depositRedeemable,
      collateralRedeemable,
      depositWithdrawable,
    };
  }

  /**
   * withdraw all available liquidity from the given bucket using multicall transaction (first quote token, then - collateral if LP is left)
   * @param signer address to redeem LP
   * @returns promise to transaction
   */
  async withdrawLiquidity(signer: Signer) {
    // get bucket details
    const bucketStatus = await this.getStatus();
    // determine lender's LP balance
    const signerAddress = await signer.getAddress();
    const [lpBalance] = await this.poolContract.lenderInfo(this.index, signerAddress);
    // multiply by exchange rate to estimate amount of quote token they can withdraw
    const estimatedDepositWithdrawal = wmul(lpBalance, bucketStatus.exchangeRate);

    // if lender has nothing to redeem, exit
    if (lpBalance.eq(constants.Zero)) {
      throw new SdkError(`${signerAddress} has no LP in bucket ${this.index}`);
    }

    // if there is any quote token in the bucket, redeem LP for deposit first
    const callData: Array<CallData> = [];
    if (lpBalance && bucketStatus.deposit.gt(0)) {
      callData.push({
        methodName: 'removeQuoteToken',
        args: [constants.MaxUint256, this.index],
      });
    }

    // CAUTION: This estimate may cause revert because we cannot predict exchange rate for an
    // arbitrary future block where the TX will be processed.
    const withdrawCollateral =
      (bucketStatus.deposit.eq(0) || estimatedDepositWithdrawal.gt(bucketStatus.deposit)) &&
      bucketStatus.collateral.gt(0);
    if (withdrawCollateral) {
      callData.push({
        methodName: 'removeCollateral',
        args: [constants.MaxUint256, this.index],
      });
    }

    return this.multicall(signer, callData);
  }
}
