import { BigNumber, Contract } from 'ethers';
import { SdkError } from '../classes/types';
import { GAS_MULTIPLIER, GAS_LIMIT_MAX } from '../constants/defaults';
import { TransactionParams } from '../constants/interfaces';

export async function submitVerifiedTransactionWithGasEstimate(
  contract: Contract,
  methodName: string,
  args: Array<any>,
  overrides?: TransactionParams
): Promise<any> {
  const estimatedGas = await estimateGas(contract, methodName, args, overrides);

  const overridesWithGasLimit = {
    ...overrides,
    gasLimit: estimatedGas ? +estimatedGas.mul(GAS_MULTIPLIER) : GAS_LIMIT_MAX,
  };

  return submitVerifiedTransaction(
    contract,
    methodName,
    args,
    overridesWithGasLimit
  );
}

export async function estimateGas(
  contract: Contract,
  methodName: string,
  args: Array<any>,
  overrides?: TransactionParams
): Promise<BigNumber | undefined> {
  try {
    return await contract.estimateGas[methodName].apply(contract, [
      ...args,
      overrides,
    ]);
  } catch {
    // continue regardless of error
  }

  return undefined;
}

export async function submitVerifiedTransaction(
  contract: Contract,
  methodName: string,
  args: Array<any>,
  overrides?: TransactionParams
): Promise<any> {
  try {
    await contract.callStatic[methodName].apply(contract, [...args, overrides]);
  } catch (e) {
    throw new SdkError(e?.toString());
  }

  const tx = await contract[methodName].apply(contract, [...args, overrides]);

  return await tx.wait();
}
