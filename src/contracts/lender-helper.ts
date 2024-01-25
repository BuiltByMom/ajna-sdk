import { BigNumber } from 'ethers';
import { Config } from '../constants';
import {
  Address,
  AjnaLenderHelper__factory,
  Signer,
  SignerOrProvider,
  TransactionOverrides,
} from '../types';
import { createTransaction } from '../utils';

export const getLenderHelperContract = (provider: SignerOrProvider) => {
  return AjnaLenderHelper__factory.connect(Config.lenderHelper, provider);
};

export async function addQuoteToken(
  signer: Signer,
  poolAddress: Address,
  maxAmount: BigNumber,
  bucketIndex: number,
  expiry: number,
  overrides?: TransactionOverrides
) {
  const lenderHelperContract = getLenderHelperContract(signer);

  return await createTransaction(
    lenderHelperContract,
    {
      methodName: 'addQuoteToken',
      args: [poolAddress, maxAmount, bucketIndex, expiry],
    },
    overrides
  );
}

export async function moveQuoteToken(
  signer: Signer,
  poolAddress: Address,
  maxAmount: BigNumber,
  fromBucketIndex: number,
  toBucketIndex: number,
  expiry: number,
  overrides?: TransactionOverrides
) {
  const lenderHelperContract = getLenderHelperContract(signer);

  return await createTransaction(
    lenderHelperContract,
    {
      methodName: 'moveQuoteToken',
      args: [poolAddress, maxAmount, fromBucketIndex, toBucketIndex, expiry],
    },
    overrides
  );
}
