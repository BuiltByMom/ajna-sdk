import { Contract } from 'ethers';
import { CallData, TransactionOverrides } from '../types';
import { createTransaction } from '../utils/transactions';

export async function multicall(
  contract: Contract,
  callData: Array<CallData>,
  overrides?: TransactionOverrides
) {
  const multicallData = callData.map(callData =>
    contract.interface.encodeFunctionData(callData.methodName, callData.args)
  );

  return await createTransaction(
    contract,
    { methodName: 'multicall', args: [multicallData] },
    overrides
  );
}
