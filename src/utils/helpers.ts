import { SdkError } from '../classes/types';
import {
  getErc20Contract,
  getErc20PoolContract,
  getErc20PoolFactoryContract,
  getErc721Contract,
  getErc721PoolContract,
  getErc721PoolFactoryContract,
  getPositionManagerContract,
} from '../contracts';
import {
  ALL_CONTRACTS,
  CustomContractTypes,
  ManagerContracts,
  POOL_CONTRACT,
  PoolContracts,
  TokenContract,
} from '../types';

export function getPoolContract(contract: POOL_CONTRACT) {
  if (!contract.contractName) {
    return contract;
  }
  switch (contract.contractName) {
    case PoolContracts.ERC20Pool: {
      return getErc20PoolContract(contract.address, contract.signer);
    }
    case PoolContracts.ERC721Pool: {
      return getErc721PoolContract(contract.address, contract.signer);
    }
    case PoolContracts.ERC20PoolFactory: {
      return getErc20PoolFactoryContract(contract.signer);
    }
    case PoolContracts.ERC721PoolFactory: {
      return getErc721PoolFactoryContract(contract.signer);
    }
    default: {
      throw new SdkError('Invalid Pool contract type of contractName');
    }
  }
}

export function getNamedContract(contract: ALL_CONTRACTS & CustomContractTypes) {
  if (!contract.contractName) {
    return contract;
  }
  switch (contract.contractName) {
    case PoolContracts.ERC20Pool: {
      return getErc20PoolContract(contract.address, contract.signer);
    }
    case PoolContracts.ERC721Pool: {
      return getErc721PoolContract(contract.address, contract.signer);
    }
    case PoolContracts.ERC20PoolFactory: {
      return getErc20PoolFactoryContract(contract.signer);
    }
    case PoolContracts.ERC721PoolFactory: {
      return getErc721PoolFactoryContract(contract.signer);
    }
    case TokenContract.ERC20: {
      return getErc20Contract(contract.address, contract.signer);
    }
    case TokenContract.ERC721: {
      return getErc721Contract(contract.address, contract.signer);
    }
    case ManagerContracts.PositionManager: {
      return getPositionManagerContract(contract.signer);
    }
    case ManagerContracts.RewardsManager: {
      return contract;
    }
    default: {
      throw new SdkError('Invalid Pool contract type of contractName', contract);
    }
  }
}

// Filter and format event args
export function formatLogArgs(args: string[]): any {
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
