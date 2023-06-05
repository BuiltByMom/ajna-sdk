import ERC20PoolABI from '../abis/ERC20Pool.json';
import {
  Address,
  CallData,
  ERC20Pool,
  ERC20Pool__factory,
  SignerOrProvider,
  TransactionOverrides,
} from '../types';
import { createTransaction } from '../utils/transactions';
import { BigNumber, Signer } from 'ethers';
import { Contract as ContractMulti } from 'ethcall';
import { POOL_CONTRACT } from '../types/type-chain';

export const getErc20PoolContract = (poolAddress: Address, provider: SignerOrProvider) => {
  return ERC20Pool__factory.connect(poolAddress, provider);
};

export const getErc20PoolContractMulti = (poolAddress: Address) => {
  return new ContractMulti(poolAddress, ERC20PoolABI);
};

export async function collateralScale(contract: ERC20Pool) {
  return await contract.collateralScale();
}

export async function drawDebt(
  contract: POOL_CONTRACT,
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
  contract: POOL_CONTRACT,
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
  contract: POOL_CONTRACT,
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
  contract: POOL_CONTRACT,
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
  const contract = getErc20PoolContract(poolAddress, signer);

  return await createTransaction(
    contract,
    { methodName: 'approve', args: [poolAddress, allowance] },
    overrides
  );
}

export async function bucketTake(
  contract: POOL_CONTRACT,
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
  contract: POOL_CONTRACT,
  borrowerAddress: Address,
  maxAmount: BigNumber,
  callee: Address,
  callData?: CallData,
  overrides?: TransactionOverrides
) {
  const encodedCallData =
    callData?.args && callData?.methodName
      ? // @ts-ignore
        contract.interface.encodeFunctionData[callData.methodName](...callData.args)
      : [];

  return await createTransaction(
    contract,
    { methodName: 'take', args: [borrowerAddress, maxAmount, callee, encodedCallData] },
    overrides
  );
}
