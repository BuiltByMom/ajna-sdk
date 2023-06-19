import { BigNumber } from 'ethers';
import { log2, bignumber as mbn } from 'mathjs';
import prices from '../constants/prices.json';
import { SdkError } from '../types/core';

// Not exported because these are implementation details of the pricing calculation
const MIN_BUCKET_INDEX = -3232;
const MAX_BUCKET_INDEX = 4156;
// Not exported because they use different BigNumber implementation than ethers.js
const MIN_PRICE = mbn('99836282890e-18');
const MAX_PRICE = mbn('1004968987.606512354182109771');
const PRICE_STEP = mbn('1.005');

/**
 *  @notice Calculates the price for a given Fenwick index
 *  @dev    Throws if index exceeds maximum constant
 *  @dev    Fenwick index is converted to bucket index
 *  @dev    Fenwick index to bucket index conversion
 *          1.00      : bucket index 0,     fenwick index 4146: 7388-4156-3232=0
 *          MAX_PRICE : bucket index 4156,  fenwick index 0:    7388-0-3232=4156.
 *          MIN_PRICE : bucket index -3232, fenwick index 7388: 7388-7388-3232=-3232.
 *  @dev    V3 (final): x^y = 2^(y*log_2(x))
 */
export const indexToPrice = (index: number) => {
  const bucketIndex = MAX_BUCKET_INDEX - index;
  if (bucketIndex < MIN_BUCKET_INDEX || bucketIndex > MAX_BUCKET_INDEX) {
    throw new SdkError('ERR_BUCKET_INDEX_OUT_OF_BOUNDS');
  }

  return BigNumber.from(prices[index]);
};

/**
 *  @notice Calculates the Fenwick index for a given price
 *  @param price bucket price, in WAD scale (1e18)
 *  @dev    Throws if price exceeds maximum constant
 *  @dev    Price expected to be inputted as a 18 decimal WAD
 *  @dev    V3 (final): bucket index =  log_2(price) / log_2(FLOAT_STEP)
 *  @dev    Fenwick index = 7388 - bucket index + 3232
 */
export const priceToIndex = (price: BigNumber) => {
  const mbnPrice = mbn(price.toString()).div(1e18);

  if (mbnPrice.lt(MIN_PRICE) || mbnPrice.gt(MAX_PRICE)) {
    throw new SdkError('ERR_BUCKET_PRICE_OUT_OF_BOUNDS');
  }

  const index = log2(mbnPrice).div(log2(PRICE_STEP)).toNumber();
  const ceilIndex = Math.ceil(index);

  if (index < 0 && ceilIndex - index > 0.5) {
    return Number(4157 - ceilIndex);
  } else {
    return Number(4156 - ceilIndex);
  }
};

// This can be used to rebuild constants/prices.json, used by indexToPrice
// jest.setTimeout(360 * 1000);
// const createPriceList = async () => {
//   let str = '';
//   let result;
//   for (let i = 1; i <= 7388; ++i) {
//     result = await utils.indexToPrice(i);
//     str += `'${result}', `;
//   }
//   const fs = require('fs');
//   fs.writeFileSync('prices.json', JSON.stringify(prices));
// };
