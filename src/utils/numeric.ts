import { BigNumber, BigNumberish, constants, ethers } from 'ethers';

// converts from WAD precision to human-readable string
export const fromWad = (value: BigNumberish) => {
  return ethers.utils.formatEther(String(value));
};

// converts from human-readable value to WAD precision
export const toWad = (value: BigNumberish) => {
  return ethers.utils.parseUnits(String(value), 'ether');
};

// calculates product of two WADs
export const wmul = (lhs: BigNumber, rhs: BigNumber) => {
  return lhs.mul(rhs).div(constants.WeiPerEther);
};

// calculates quotient of two WADs
export const wdiv = (lhs: BigNumber, rhs: BigNumber) => {
  return lhs.mul(constants.WeiPerEther).div(rhs);
};
