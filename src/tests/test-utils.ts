import { BigNumber, ContractReceipt, Event } from 'ethers';
import { WrappedTransaction } from '../types/core';
import { expect } from '@jest/globals';
import type { MatcherFunction } from 'expect';
import { formatLogArgs } from '../utils';

export const submitAndVerifyTransaction = async (tx: WrappedTransaction) => {
  const receipt = await tx.verifyAndSubmit();
  expect(receipt).toBeDefined();
  expect(receipt.confirmations).toBeGreaterThanOrEqual(1);
  expect(receipt.transactionHash).not.toBe('');
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

interface ContractEventDetails {
  event: string;
  args: any[];
  parsedArgs: {
    [arg: string]: any;
  };
  data: string;
  address: string;
  topics: string[];
  eventSignature: string;
}

interface ParsedTxResults {
  [event: string]: ContractEventDetails;
}

export function parseTxEvents(txReceipt: ContractReceipt) {
  const { events } = txReceipt;
  const parsedEvents: ParsedTxResults = events?.reduce((acc: any, e: Event) => {
    const { data, args, address, topics, eventSignature, event } = e;
    if (event && eventSignature) {
      const parsedArgs = args?.length ? formatLogArgs(args as string[]) : undefined;
      console.log(event, `parsedArgs:`, parsedArgs);
      return {
        ...acc,
        [event as string]: { event, args, parsedArgs, data, address, topics, eventSignature },
      } as ContractEventDetails;
    }
    return acc;
  }, {});

  console.log(`parsed events:`, parsedEvents);
  return parsedEvents;
}
