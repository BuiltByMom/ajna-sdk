import ERC20Pool from '../abis/ERC20Pool.json';
import { Address, SignerOrProvider, TransactionOverrides } from '../types';
import { createTransaction } from '../utils/transactions';
import { getErc20Contract } from './erc20';
import { BigNumber, Contract, Signer, ethers } from 'ethers';

export const getErc20PoolContract = (poolAddress: Address, provider: SignerOrProvider) => {
  return new ethers.Contract(poolAddress, ERC20Pool, provider);
};

export async function drawDebt(
  contract: Contract,
  borrowerAddress: Address,
  amountToBorrow: BigNumber,
  limitIndex: number,
  collateralToPledge: BigNumber,
  overrides?: TransactionOverrides
) {
  return await createTransaction(
    contract,
    'drawDebt',
    [borrowerAddress, amountToBorrow, limitIndex, collateralToPledge],
    overrides
  );
}

export async function repayDebt(
  contract: Contract,
  borrowerAddress: Address,
  maxQuoteTokenAmountToRepay: BigNumber,
  collateralAmountToPull: BigNumber,
  collateralReceiver: Address,
  limitIndex: number,
  overrides?: TransactionOverrides
) {
  return await createTransaction(
    contract,
    'repayDebt',
    [
      borrowerAddress,
      maxQuoteTokenAmountToRepay,
      collateralAmountToPull,
      collateralReceiver,
      limitIndex,
    ],
    overrides
  );
}

export async function addCollateral(
  contract: Contract,
  amountToAdd: BigNumber,
  bucketIndex: number,
  expiry?: number,
  overrides?: TransactionOverrides
) {
  return await createTransaction(
    contract,
    'addCollateral',
    [amountToAdd, bucketIndex, expiry],
    overrides
  );
}

export async function removeCollateral(
  contract: Contract,
  bucketIndex: number,
  maxAmount: BigNumber,
  overrides?: TransactionOverrides
) {
  return await createTransaction(contract, 'removeCollateral', [maxAmount, bucketIndex], overrides);
}

export async function approve(
  signer: Signer,
  poolAddress: Address,
  tokenAddress: Address,
  allowance: BigNumber,
  overrides?: TransactionOverrides
) {
  const contract = getErc20Contract(tokenAddress, signer);

  return await createTransaction(contract, 'approve', [poolAddress, allowance], overrides);
}
