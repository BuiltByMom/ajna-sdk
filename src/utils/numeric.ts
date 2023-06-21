import { BigNumber, BigNumberish, constants, ethers } from 'ethers';
import { formatUnits } from 'ethers/lib/utils';
import { isBoolean } from 'mathjs';

// converts from WAD precision to human-readable string
export const fromWad = (value: BigNumberish): string => {
  return ethers.utils.formatEther(String(value));
};

// converts from human-readable value to WAD precision
export const toWad = (value: BigNumberish): BigNumber => {
  return ethers.utils.parseUnits(String(value), 'ether');
};

// calculates product of two WADs
export const wmul = (lhs: BigNumber, rhs: BigNumber): BigNumber => {
  return lhs.mul(rhs).div(constants.WeiPerEther);
};

// calculates quotient of two WADs
export const wdiv = (lhs: BigNumber, rhs: BigNumber): BigNumber => {
  return lhs.mul(constants.WeiPerEther).div(rhs);
};

// returns the minimum of two WADs
export const min = (lhs: BigNumber, rhs: BigNumber): BigNumber => (lhs.lte(rhs) ? lhs : rhs);

// returns the maximum of two WADs
export const max = (lhs: BigNumber, rhs: BigNumber): BigNumber => (lhs.gte(rhs) ? lhs : rhs);

export function formatArgValues(obj: any) {
  return Object.keys(obj).reduce((acc, value) => {
    if (BigNumber.isBigNumber(obj[value]) || isBoolean(obj[value])) {
      return {
        ...acc,
        [value]: formatUnits(obj[value].toString(), 18),
      };
    }
    return {
      ...acc,
      [value]: obj[value],
    };
  }, {});
}
