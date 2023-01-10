import { ethers } from 'ethers';

const toEther = (value: number | string) => {
  return ethers.utils.formatEther(String(value));
};

export default toEther;
