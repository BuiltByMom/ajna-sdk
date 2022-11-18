import Web3 from 'web3';
import { AbiItem } from 'web3-utils';
import {
  CollateralApproveParams,
  CollateralBalanceParams,
  QuoteApproveParams,
  QuoteBalanceParams
} from '../constants/interfaces';
import toWei from '../utils/to-wei';
import erc20Abi from '../abis/ERC20.json';

export const getGenericContract = (web3: Web3, contractAddress: string) => {
  return new web3.eth.Contract(erc20Abi as AbiItem[], contractAddress);
};

export const collateralApprove = async (params: CollateralApproveParams) => {
  const { web3, poolAddress, allowance, collateralAddress, from } = params;
  const contractCollateral = getGenericContract(web3, collateralAddress);

  return await contractCollateral.methods
    .approve(poolAddress, toWei(allowance))
    .send({
      from,
      gas: 200000
    });
};

export const quoteApprove = async (params: QuoteApproveParams) => {
  const { web3, poolAddress, allowance, quoteAddress, from } = params;
  const contractQuote = getGenericContract(web3, quoteAddress);

  return await contractQuote.methods
    .approve(poolAddress, toWei(allowance))
    .send({
      from,
      gas: 2000000
    });
};

export const getBorrowerQuoteBalance = async (params: QuoteBalanceParams) => {
  const { web3, quoteAddress, tokenAddress } = params;
  const contractQuote = getGenericContract(web3, quoteAddress);

  return await contractQuote.methods.balanceOf(tokenAddress).call();
};

export const getBorrowerCollateralBalance = async (
  params: CollateralBalanceParams
) => {
  const { web3, collateralAddress, tokenAddress } = params;
  const contractCollateral = getGenericContract(web3, collateralAddress);

  return await contractCollateral.methods.balanceOf(tokenAddress).call();
};

export const getQuoteBalance = async (params: QuoteBalanceParams) => {
  const { web3, quoteAddress, tokenAddress } = params;
  const contractQuote = getGenericContract(web3, quoteAddress);

  return await contractQuote.methods.balanceOf(tokenAddress).call();
};
