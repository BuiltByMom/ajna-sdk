import { BigNumberish, ethers } from 'ethers';

const toWei = (value: BigNumberish) => {
  return ethers.utils.parseUnits(String(value), 'ether');
};

export default toWei;
