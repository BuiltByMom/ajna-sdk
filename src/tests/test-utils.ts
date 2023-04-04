import { WrappedTransaction } from '../types/core';

export const submitAndVerifyTransaction = async (tx: WrappedTransaction) => {
  const receipt = await tx.verifyAndSubmit();
  expect(receipt.transactionHash).not.toBe('');
};
