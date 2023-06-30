import { ONE_HALF_WAD } from '../constants/common';
import { BigNumber, BigNumberish, constants, ethers } from 'ethers';

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
