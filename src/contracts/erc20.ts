import erc20Abi from '../abis/ERC20.json';
import {
  CollateralBalanceParamsContract,
  QuoteBalanceParamsContract,
  SignerOrProvider,
} from '../constants/interfaces';
import { ethers } from 'ethers';

export const getErc20Contract = (
  contractAddress: string,
  provider: SignerOrProvider
) => {
  return new ethers.Contract(contractAddress, erc20Abi, provider);
};

export const getCollateralBalance = async (
  params: CollateralBalanceParamsContract
) => {
  const { collateralAddress, holderAddress, provider } = params;
  const contractCollateral = getErc20Contract(collateralAddress, provider);

  return Number(await contractCollateral.balanceOf(holderAddress));
};

export const getQuoteBalance = async (params: QuoteBalanceParamsContract) => {
  const { quoteAddress, holderAddress, provider } = params;
  const contractQuote = getErc20Contract(quoteAddress, provider);

  return Number(await contractQuote.balanceOf(holderAddress));
};
