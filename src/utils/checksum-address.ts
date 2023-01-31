import { Address } from 'constants/interfaces';
import { ethers } from 'ethers';

const checksumAddress = (address: Address) => {
  return ethers.utils.getAddress(address);
};

export default checksumAddress;
