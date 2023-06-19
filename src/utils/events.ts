import { Log } from '@ethersproject/providers';
import { Contract, ContractReceipt, Event } from 'ethers';
import {
  ContractEventDetails,
  EventArg,
  EventName,
  ParsedEventsByEventName,
  ParsedLogsByEventName,
  SdkError,
  TransactionLogDetails,
} from '../types';
import { Result } from '@ethersproject/abi';
import { getAddress } from 'ethers/lib/utils';

export function formatLogArgs(args: Result): any {
  const formatted = Object.keys(args).reduce((acc: any, arg: string) => {
    // Filter numerical keys
    if (Number.isInteger(parseInt(arg)) || arg === 'log') {
      return acc;
    }

    return {
      ...acc,
      [arg]: args[arg as keyof typeof args],
    };
  }, {});
  return formatted;
}

export function parseTxLogs(txReceipt: ContractReceipt, contract: Contract) {
  const { logs } = txReceipt;

  let parsedLogs;
  if (!!contract) {
    parsedLogs = logs?.reduce((acc: any, log: Log) => {
      if (getAddress(log.address) !== getAddress(contract.address)) {
        return acc;
      }
      const { topics, data, address, transactionHash } = log;
      const logDescription = contract.interface.parseLog({ topics, data });
      const { args, signature, topic, name, eventFragment } = logDescription;
      const { inputs, name: eventName } = eventFragment;

      const parsedArgs = args.length ? formatLogArgs(args) : undefined;

      const logData: TransactionLogDetails = {
        eventName: name,
        signature,
        address,
        parsedArgs,
        topic,
        inputs,
        txHash: transactionHash,
      };

      // console.log(name, eventName, logData);

      return {
        ...acc,
        [eventName]: logData,
      } as ParsedLogsByEventName;
    }, {});
  }

  return parsedLogs;
}

export function parseTxEvents(txReceipt: ContractReceipt) {
  const { events } = txReceipt;
  const parsedEvents = events?.reduce((acc: any, event: Event) => {
    const {
      data,
      args,
      address,
      topics,
      eventSignature,
      event: eventName,
      decodeError,
      transactionHash,
    } = event;

    if (eventName && args?.length) {
      try {
        const parsedArgs = formatLogArgs(args);
        const eventData: ContractEventDetails = {
          address,
          eventName,
          eventSignature,
          parsedArgs,
          topics,
          data,
          txHash: transactionHash,
        };

        // console.log(eventName, eventData);

        return {
          ...acc,
          [eventName as EventName]: eventData,
        } as ParsedEventsByEventName;
      } catch (error: any) {
        throw new SdkError(decodeError ? decodeError.message : 'error parsing event args', error);
      }
    }

    return acc;
  }, {});
  return parsedEvents;
}

export function getFormattedArgs(
  parsedEvents: ParsedEventsByEventName | ParsedLogsByEventName,
  eventName: EventName
) {
  return parsedEvents?.[eventName]?.parsedArgs as EventArg;
}

export function getParsedEvents(txReceipt: ContractReceipt, contract: Contract) {
  const parsedEvents = txReceipt.events?.length
    ? parseTxEvents(txReceipt)
    : parseTxLogs(txReceipt, contract);
  return parsedEvents;
}

export function getTxEventArgs(
  txReceipt: ContractReceipt,
  contract: Contract,
  eventName: EventName
) {
  // console.log(txReceipt.logs.length, `logs`);
  const parsedEvents = getParsedEvents(txReceipt, contract);
  if (parsedEvents && Object.keys(parsedEvents).length) {
    return getFormattedArgs(parsedEvents, eventName);
  }
  return parsedEvents;
}
