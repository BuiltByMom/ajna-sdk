import erc20Abi from '../abis/ERC20.json';
import { Address, SignerOrProvider } from '../types';
import { ethers } from 'ethers';

export const getErc20Contract = (contractAddress: string, provider: SignerOrProvider) => {
  return new ethers.Contract(contractAddress, erc20Abi, provider);
};

export const getCollateralBalance = async (
  provider: SignerOrProvider,
  collateralAddress: Address,
  holderAddress: Address
) => {
  const contractCollateral = getErc20Contract(collateralAddress, provider);

  return Number(await contractCollateral.balanceOf(holderAddress));
};

export const getQuoteBalance = async (
  provider: SignerOrProvider,
  quoteAddress: Address,
  holderAddress: Address
) => {
  const contractQuote = getErc20Contract(quoteAddress, provider);

  return Number(await contractQuote.balanceOf(holderAddress));
};
