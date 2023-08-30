import { Bucket, BucketStatus } from './Bucket';
import { Pool } from './Pool';

import { SignerOrProvider } from '../types';
import { bucketInfo } from '../contracts/pool-info-utils';

export class NonfungibleBucket extends Bucket {
  /**
   * @param provider JSON-RPC endpoint.
   * @param pool     Pool to which this bucket belongs.
   * @param index    Price bucket index.
   */
  constructor(provider: SignerOrProvider, pool: Pool, index: number) {
    super(provider, pool, index);
  }

  // TODO: UPDATE THIS TO HANDLE LACK OF BUCKET COLLATERAL
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
}
