import { BigNumber } from 'ethers';
import { getAjnaTokenContract } from './common';
import { Config } from '../constants';
import {
  Address,
  BurnWrappedAjna__factory,
  Signer,
  SignerOrProvider,
  TransactionOverrides,
} from '../types';
import { createTransaction } from '../utils';

export const getBurnWrapperContract = (provider: SignerOrProvider) => {
  return BurnWrappedAjna__factory.connect(Config.burnWrapper, provider);
};

export async function approveAjna(
  signer: Signer,
  allowance: BigNumber,
  overrides?: TransactionOverrides
) {
  const ajnaTokenContract = getAjnaTokenContract(signer);
  const burnWrapperContract = getBurnWrapperContract(signer);

  return await createTransaction(
    ajnaTokenContract,
    { methodName: 'approve', args: [burnWrapperContract.address, allowance] },
    overrides
  );
}

export async function depositFor(
  signer: Signer,
  recipient: Address,
  amount: BigNumber,
  overrides?: TransactionOverrides
) {
  const contractInstance = getBurnWrapperContract(signer);
  return await createTransaction(
    contractInstance,
    { methodName: 'depositFor', args: [recipient, amount] },
    overrides
  );
}
