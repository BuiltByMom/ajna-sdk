import Web3 from 'web3';
import { AbiItem } from 'web3-utils';
import {
  CollateralBalanceParamsRaw,
  QuoteBalanceParamsRaw
} from '../constants/interfaces';
import erc20Abi from '../abis/ERC20.json';

export const getGenericContract = (web3: Web3, contractAddress: string) => {
  return new web3.eth.Contract(erc20Abi as AbiItem[], contractAddress);
};

export const getBorrowerQuoteBalance = async (
  params: QuoteBalanceParamsRaw
) => {
  const { web3, quoteAddress, tokenAddress } = params;
  const contractQuote = getGenericContract(web3, quoteAddress);

  return await contractQuote.methods.balanceOf(tokenAddress).call();
};

export const getBorrowerCollateralBalance = async (
  params: CollateralBalanceParamsRaw
) => {
  const { web3, collateralAddress, tokenAddress } = params;
  const contractCollateral = getGenericContract(web3, collateralAddress);

  return Number(
    await contractCollateral.methods.balanceOf(tokenAddress).call()
  );
};

export const getQuoteBalance = async (params: QuoteBalanceParamsRaw) => {
  const { web3, quoteAddress, tokenAddress } = params;
  const contractQuote = getGenericContract(web3, quoteAddress);

  return Number(await contractQuote.methods.balanceOf(tokenAddress).call());
};
