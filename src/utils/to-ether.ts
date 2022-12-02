import { ethers } from 'ethers';

const toEther = (value: number | string) => {
  return ethers.utils.parseEther(String(value));
};

export default toEther;
