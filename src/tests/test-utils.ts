import { BigNumber } from 'ethers';
import { SdkError, WrappedTransaction } from '../types/core';
import { expect } from '@jest/globals';
import type { MatcherFunction } from 'expect';

export const submitAndVerifyTransaction = async (tx: WrappedTransaction) => {
  try {
    const receipt = await tx.verifyAndSubmit();
    expect(receipt).toBeDefined();
    expect(receipt.confirmations).toBeGreaterThanOrEqual(1);
    expect(receipt.transactionHash).not.toBe('');
    return receipt;
  } catch (error: any) {
    throw new SdkError(error.message, error);
  }
};

const toBeBetween: MatcherFunction<[smaller: unknown, larger: unknown]> = function (
  value,
  smaller,
  larger
) {
  if (!(value instanceof BigNumber)) throw new Error('value must be BigNumber');
  if (!(smaller instanceof BigNumber)) throw new Error('smaller must be BigNumber');
  if (!(larger instanceof BigNumber)) throw new Error('larger must be BigNumber');

  const gt = value.gt(smaller);
  if (!gt) return { pass: false, message: () => value + ' !> ' + smaller };
  const lt = value.lt(larger);
  if (!lt) return { pass: false, message: () => value + ' !< ' + larger };

  return { pass: true, message: () => value + ' between ' + smaller + ' and ' + larger };
};

expect.extend({
  toBeBetween,
});

declare module 'expect' {
  interface AsymmetricMatchers {
    toBeBetween(smaller: BigNumber, larger: BigNumber): void;
  }
  interface Matchers<R> {
    toBeBetween(smaller: BigNumber, larger: BigNumber): R;
  }
}
