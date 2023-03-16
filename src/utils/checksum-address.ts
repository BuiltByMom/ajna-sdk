import { Address } from '../types';
import { ethers } from 'ethers';

const checksumAddress = (address: Address) => {
  return ethers.utils.getAddress(address);
};

export default checksumAddress;
