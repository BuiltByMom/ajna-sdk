import { Erc20Address } from 'constants/interfaces';
import { ethers } from 'ethers';

const checksumAddress = (address: Erc20Address) => {
  return ethers.utils.getAddress(address);
};

export default checksumAddress;
