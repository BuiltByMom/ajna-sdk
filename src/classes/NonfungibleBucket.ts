import { Signer, constants } from 'ethers';
import { Bucket } from './Bucket';
import { Pool } from './Pool';

import { CallData, SdkError, SignerOrProvider } from '../types';
import { wadToIntRoundingDown, wmul } from '../utils/numeric';

export class NonfungibleBucket extends Bucket {
  /**
   * @param provider JSON-RPC endpoint.
   * @param pool     Pool to which this bucket belongs.
   * @param index    Price bucket index.
   */
  constructor(provider: SignerOrProvider, pool: Pool, index: number) {
    super(provider, pool, index);
  }

  //   TODO: should this account for surplus amount? We need to also support the use case of mergeOrRemoveCollateral
  //   /**
  //    * Calculate the amount of tokenIds that can be redeemed in the bucket for a given quoteTokenAmount
  //    * @param signer address to redeem LP
  //    * @returns promise to transaction
  //    */
  //   async tokensForQuoteTokenAmount(signer: Signer, quoteTokenAmount: number): number {
  //   }

  //   async tokensAvailableToWithdraw(signer: Signer): number {
  //     // get bucket collateral info
  //   }

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
    const tokensToRemove = wadToIntRoundingDown(bucketStatus.collateral);
    if (withdrawCollateral && tokensToRemove > 0) {
      callData.push({
        methodName: 'removeCollateral',
        args: [tokensToRemove, this.index],
      });
    }

    return this.multicall(signer, callData);
  }
}
