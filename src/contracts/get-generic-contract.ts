import erc20Abi from '../abis/ERC20.json';
import {
  CollateralBalanceParamsContract,
  QuoteBalanceParamsContract,
  SignerOrProvider
} from '../constants/interfaces';
import { ethers } from 'ethers';

export const getGenericContract = (
  contractAddress: string,
  provider: SignerOrProvider
) => {
  return new ethers.Contract(contractAddress, erc20Abi, provider);
};

export const getBorrowerQuoteBalance = async (
  params: QuoteBalanceParamsContract
) => {
  const { quoteAddress, tokenAddress, provider } = params;
  const contractQuote = getGenericContract(quoteAddress, provider);

  return await contractQuote.balanceOf(tokenAddress);
};

export const getBorrowerCollateralBalance = async (
  params: CollateralBalanceParamsContract
) => {
  const { collateralAddress, tokenAddress, provider } = params;
  const contractCollateral = getGenericContract(collateralAddress, provider);

  return Number(await contractCollateral.balanceOf(tokenAddress));
};

export const getQuoteBalance = async (params: QuoteBalanceParamsContract) => {
  const { quoteAddress, tokenAddress, provider } = params;
  const contractQuote = getGenericContract(quoteAddress, provider);

  return Number(await contractQuote.balanceOf(tokenAddress));
};
