const FLOAT_STEP_INT = 1.005 * 10 ** 18;

/**
 *  @todo currently not working and not used in the SDK.
 *  @notice Calculates the Fenwick index for a given price
 *  @dev    Throws if price exceeds maximum constant
 *  @dev    Price expected to be inputted as a 18 decimal WAD
 *  @dev    V1: bucket index = (price - MIN_PRICE) / FLOAT_STEP
 *          V2: bucket index = (log(FLOAT_STEP) * price) /  MAX_PRICE
 *          V3 (final): bucket index =  log_2(price) / log_2(FLOAT_STEP)
 *  @dev    Fenwick index = 7388 - bucket index + 3232
 */
const priceToIndex = (price: number) => {
  const index = Math.log2(price) / Math.log2(FLOAT_STEP_INT);
  const ceilIndex = Math.ceil(index);

  if (index < 0 && ceilIndex - index > 0.5 * 1e18) {
    return Number(4157 - toInt(ceilIndex));
  }

  return Number(4156 - toInt(ceilIndex));
};

export default priceToIndex;

function toInt(x: number): number {
  const SCALE = 1e18;
  return x / SCALE;
}
