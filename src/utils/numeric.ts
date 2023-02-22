import { BigNumberish, ethers } from 'ethers';

// converts from WAD precision to human-readable string
export const fromWad = (value: BigNumberish) => {
  return ethers.utils.formatEther(String(value));
};

// converts from human-readable value to WAD precision
export const toWad = (value: BigNumberish) => {
  return ethers.utils.parseUnits(String(value), 'ether');
};
