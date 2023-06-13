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
  ManagerContracts,
  POOL_CONTRACT,
  PoolContracts,
  TokenContract,
} from '../types';

export function getPoolContract(contract: POOL_CONTRACT) {
  switch (contract.contractName) {
    case PoolContracts.ERC20Pool: {
      return getErc20PoolContract(contract.address, contract.signer || contract.provider);
    }
    case PoolContracts.ERC721Pool: {
      return getErc721PoolContract(contract.address, contract.signer || contract.provider);
    }
    case PoolContracts.ERC20PoolFactory: {
      return getErc20PoolFactoryContract(contract.signer || contract.provider);
    }
    case PoolContracts.ERC721PoolFactory: {
      return getErc721PoolFactoryContract(contract.signer || contract.provider);
    }
    default: {
      throw new SdkError('Invalid Pool contract type of contractName');
    }
  }
}

export function getNamedContract(contract: ALL_CONTRACTS) {
  switch (contract.contractName) {
    case TokenContract.ERC20: {
      return getErc20Contract(contract.address, contract.signer || contract.provider);
    }
    case TokenContract.ERC721: {
      return getErc721Contract(contract.address, contract.signer || contract.provider);
    }
    case ManagerContracts.PositionManager: {
      return getPositionManagerContract(contract.signer || contract.provider);
    }
    case ManagerContracts.RewardsManager: {
      return contract;
    }
    default: {
      throw new SdkError('Invalid Pool contract type of contractName');
    }
  }
}
