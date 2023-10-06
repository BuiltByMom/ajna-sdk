import { BigNumber, BigNumberish, constants, ethers } from 'ethers';
import { ONE_HALF_WAD } from '../constants/common';

// converts from WAD precision to human-readable string
export const fromWad = (value: BigNumberish): string => {
  return ethers.utils.formatEther(String(value));
};

// converts from human-readable value to WAD precision
export const toWad = (value: BigNumberish): BigNumber => {
  return ethers.utils.parseEther(String(value));
};

// calculates product of two WADs
export const wmul = (lhs: BigNumber, rhs: BigNumber): BigNumber => {
  // (x * y + WAD / 2) / WAD;
  return lhs.mul(rhs).add(ONE_HALF_WAD).div(constants.WeiPerEther);
};

// calculates quotient of two WADs
export const wdiv = (lhs: BigNumber, rhs: BigNumber): BigNumber => {
  // return (x * WAD + y / 2) / y;
  return lhs
    .mul(constants.WeiPerEther)
    .add(rhs.div(BigNumber.from(2)))
    .div(rhs);
};

// returns the minimum of two WADs
export const min = (lhs: BigNumber, rhs: BigNumber): BigNumber => (lhs.lte(rhs) ? lhs : rhs);

// returns the maximum of two WADs
export const max = (lhs: BigNumber, rhs: BigNumber): BigNumber => (lhs.gte(rhs) ? lhs : rhs);

export const wadToIntRoundingDown = (wad: BigNumber): number => {
  return wdiv(wad, constants.One).div(constants.One).toNumber();
};

/**
 * Calculates the square root of a WAD based on the Heron's method algorithm, described as a solution in
 * an issue by a member of ether.js library https://github.com/ethers-io/ethers.js/issues/1182#issuecomment-744142921
 * @param {BigNumberish} value WAD to calculate the square root of
 * @returns {BigNumber} Square root
 *
 * @example
 *
 * // equals to WAD representation of 2
 * wsqrt(toWad('4'))
 * // equals to WAD representation of 447.9979129415671731
 * wsqrt(toWad('200702.13'))
 */
export const wsqrt = (value: BigNumberish) => {
  const x = toWad(value);
  let z = x.add(constants.One).div(constants.Two);
  let y = x;

  while (z.sub(y).isNegative()) {
    y = z;
    z = x.div(z).add(z).div(constants.Two);
  }
  return y;
};
