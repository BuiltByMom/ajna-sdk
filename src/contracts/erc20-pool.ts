import ERC20Pool from '../abis/ERC20Pool.json';
import { Address, CallData, SignerOrProvider, TransactionOverrides } from '../types';
import { createTransaction } from '../utils/transactions';
import { getErc20Contract } from './erc20';
import { BigNumber, Contract, Signer, ethers } from 'ethers';
import { Contract as ContractMulti } from 'ethcall';

export const getErc20PoolContract = (poolAddress: Address, provider: SignerOrProvider) => {
  return new ethers.Contract(poolAddress, ERC20Pool, provider);
};

export const getErc20PoolContractMulti = (poolAddress: Address) => {
  return new ContractMulti(poolAddress, ERC20Pool);
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
    {
      methodName: 'drawDebt',
      args: [borrowerAddress, amountToBorrow, limitIndex, collateralToPledge],
    },
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
    {
      methodName: 'repayDebt',
      args: [
        borrowerAddress,
        maxQuoteTokenAmountToRepay,
        collateralAmountToPull,
        collateralReceiver,
        limitIndex,
      ],
    },
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
    { methodName: 'addCollateral', args: [amountToAdd, bucketIndex, expiry] },
    overrides
  );
}

export async function removeCollateral(
  contract: Contract,
  bucketIndex: number,
  maxAmount: BigNumber,
  overrides?: TransactionOverrides
) {
  return await createTransaction(
    contract,
    { methodName: 'removeCollateral', args: [maxAmount, bucketIndex] },
    overrides
  );
}

export async function approve(
  signer: Signer,
  poolAddress: Address,
  tokenAddress: Address,
  allowance: BigNumber,
  overrides?: TransactionOverrides
) {
  const contract = getErc20Contract(tokenAddress, signer);

  return await createTransaction(
    contract,
    { methodName: 'approve', args: [poolAddress, allowance] },
    overrides
  );
}

export async function bucketTake(
  contract: Contract,
  borrowerAddress: Address,
  depositTake: boolean,
  bucketIndex: number,
  overrides?: TransactionOverrides
) {
  return await createTransaction(
    contract,
    { methodName: 'bucketTake', args: [borrowerAddress, depositTake, bucketIndex] },
    overrides
  );
}

export async function take(
  contract: Contract,
  borrowerAddress: Address,
  maxAmount: BigNumber,
  callee: Address,
  callData?: CallData,
  overrides?: TransactionOverrides
) {
  const encodedCallData = callData
    ? contract.interface.encodeFunctionData(callData.methodName, callData.args)
    : [];

  return await createTransaction(
    contract,
    { methodName: 'take', args: [borrowerAddress, maxAmount, callee, encodedCallData] },
    overrides
  );
}

export async function settle(
  contract: Contract,
  borrowerAddress: Address,
  maxDepth: BigNumber,
  overrides?: TransactionOverrides
) {
  return await createTransaction(
    contract,
    { methodName: 'settle', args: [borrowerAddress, maxDepth] },
    overrides
  );
}
