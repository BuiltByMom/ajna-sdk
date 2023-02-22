import ERC20Pool from '../abis/ERC20Pool.json';
import {
  Address,
  DrawDebtParamsContract,
  GenericApproveParamsContract,
  RepayDebtParamsContract,
  SignerOrProvider,
} from '../constants/interfaces';
import { getErc20Contract } from './erc20';
import { ethers } from 'ethers';

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

export const approve = async ({
  provider,
  poolAddress,
  allowance,
  tokenAddress,
}: GenericApproveParamsContract) => {
  const contract = getErc20Contract(tokenAddress, provider);

  return await contract.approve(poolAddress, allowance, {
    gasLimit: 1000000,
  });
};
