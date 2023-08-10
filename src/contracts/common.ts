import { Contract, ethers } from 'ethers';
import ajnaTokenAbi from '../abis/AjnaToken.json';
import { Config } from '../constants';
import { CallData, SignerOrProvider, TransactionOverrides } from '../types';
import checksumAddress from '../utils/checksum-address';
import { createTransaction } from '../utils/transactions';

export const getAjnaTokenContract = (provider: SignerOrProvider) => {
  return new ethers.Contract(checksumAddress(Config.ajnaToken), ajnaTokenAbi, provider);
};

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
