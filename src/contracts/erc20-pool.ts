import ERC20Pool from '../abis/ERC20Pool.json';
import {
  Address,
  DrawDebtParamsContract,
  RepayDebtParamsContract,
  SignerOrProvider,
} from '../types';
import { createTransaction } from '../utils/transactions';
import { getErc20Contract } from './erc20';
import { BigNumber, Signer, ethers } from 'ethers';

export const getErc20PoolContract = (
  poolAddress: Address,
  provider: SignerOrProvider
) => {
  return new ethers.Contract(poolAddress, ERC20Pool, provider);
};

export const drawDebt = async ({
  contract,
  borrowerAddress,
  amountToBorrow,
  limitIndex,
  collateralToPledge,
}: DrawDebtParamsContract) => {
  const tx = await contract.drawDebt(
    borrowerAddress,
    amountToBorrow,
    limitIndex,
    collateralToPledge,
    {
      gasLimit: 1000000,
    }
  );

  return tx.wait();
};

export const repayDebt = async ({
  contract,
  borrowerAddress,
  maxQuoteTokenAmountToRepay,
  collateralAmountToPull,
  collateralReceiver,
  limitIndex,
}: RepayDebtParamsContract) => {
  return await contract.repayDebt(
    borrowerAddress,
    maxQuoteTokenAmountToRepay,
    collateralAmountToPull,
    collateralReceiver,
    limitIndex,
    {
      gasLimit: 1000000,
    }
  );
};

export const approve = async (
  signer: Signer,
  poolAddress: Address,
  tokenAddress: Address,
  allowance: BigNumber
) => {
  const contract = getErc20Contract(tokenAddress, signer);

  return await createTransaction(contract, 'approve', [poolAddress, allowance]);
};
