import ERC20PoolAbi from '../abis/ERC20Pool.json';
import {
  Address,
  ERC20Pool,
  ERC20Pool__factory,
  SignerOrProvider,
  TransactionOverrides,
} from '../types';
import { createTransaction } from '../utils/transactions';
import { getErc20Contract } from './erc20';
import { BigNumber, Contract, Signer } from 'ethers';
import { Contract as ContractMulti } from 'ethcall';

export const getErc20PoolContract = (poolAddress: Address, provider: SignerOrProvider) => {
  return ERC20Pool__factory.connect(poolAddress, provider);
};

export const getErc20PoolContractMulti = (poolAddress: Address) => {
  return new ContractMulti(poolAddress, ERC20PoolAbi);
};

export const getErc20PoolInterface = () => {
  return ERC20Pool__factory.createInterface();
};

export async function collateralScale(contract: Contract) {
  return await contract.collateralScale();
}

export async function drawDebt(
  contract: ERC20Pool,
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

export async function addCollateral(
  contract: ERC20Pool,
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
