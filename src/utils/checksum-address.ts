import { ethers } from 'ethers';
import { Address } from '../types';

const checksumAddress = (address: Address) => {
  return ethers.utils.getAddress(address);
};

export default checksumAddress;
