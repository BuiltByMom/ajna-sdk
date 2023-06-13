import { CallData, TOKEN_POOL, TransactionOverrides } from '../types';
import { createTransaction } from '../utils/transactions';

export async function multicall(
  contract: TOKEN_POOL,
  callData: Array<CallData>,
  overrides?: TransactionOverrides
) {
  const multicallData = callData.map((callData: Omit<CallData, 'withdrawBonds'>) =>
    contract.interface.encodeFunctionData(callData.methodName, callData.args)
  );

  return await createTransaction(
    contract,
    { methodName: 'multicall', args: [multicallData] },
    overrides
  );
}
