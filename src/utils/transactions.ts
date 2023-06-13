import { keccak256, toUtf8Bytes } from 'ethers/lib/utils';
import { getErc20PoolFactoryContract } from '../contracts/erc20-pool-factory';
import {
  CallData,
  ERC20Pool,
  ERC721Pool,
  TransactionOverrides,
  SignerOrProvider,
  WrappedTransaction,
  PoolContracts,
  TOKEN_POOL_CONTRACTS,
} from '../types';
import { BigNumber, ContractTransaction, PopulatedTransaction } from 'ethers';
import { SdkError } from './errors';
import { getPoolContract } from '../tests/examples.spec';
import { GAS_MULTIPLIER } from '../constants';
import { Pool } from '../classes/Pool';

/**
 * Creates a wrapped transaction object that can be used to submit, verify, and estimate gas for a transaction.
 * @param contract The ethers.js contract instance.
 * @param methodName The name of the method to call on the contract.
 * @param args An array of arguments to pass to the method.
 * @param overrides An optional object with transaction overrides, such as gasPrice and gasLimit.
 * @returns The wrapped transaction object.
 */
export async function createTransaction(
  contract: TOKEN_POOL_CONTRACTS,
  callData: CallData,
  overrides?: TransactionOverrides
): Promise<any> {
  const { methodName, args = [] } = callData;
  const [collateralAddress, quoteAddress, interestRate] = args;
  const signer = contract.signer;
  console.log(`signer:`, signer);
  console.log(`collateralAddress:`, collateralAddress);
  console.log(`quoteAddress:`, quoteAddress);
  console.log(`interestRate:`, interestRate);
  console.log(`overrides:`, overrides);

  const erc20PoolFactory = getErc20PoolFactoryContract(signer);
  try {
    const deployPoolEstimation = await erc20PoolFactory.estimateGas.deployPool(
      collateralAddress,
      quoteAddress,
      interestRate,
      {
        from: await signer.getAddress(),
        ...overrides,
      }
    );
    const gasEstimation = await (erc20PoolFactory.estimateGas as any)[methodName](...args, {
      from: await signer.getAddress(),
      ...overrides,
    });

    console.log(`gasEstimation:`, gasEstimation);

    const definedArgs = args.filter(a => a !== undefined);
    let c;
    if ('contractName' in contract) {
      if (contract.contractName === PoolContracts.ERC20Pool) {
        c = contract as ERC20Pool;
      } else if (contract.contractName === PoolContracts.ERC721Pool) {
        c = contract as ERC721Pool;
      }
    } else {
      throw new Error(`Invalid TOKEN_POOL: ${contract}`);
    }

    return (c as any).populateTransaction[methodName]([
      ...definedArgs,
      {
        ...overrides,
        from: await c?.signer.getAddress(),
      },
    ]);
  } catch (error: any) {
    console.log(`error:`, error);
  }
}

/**
 * A class representing a wrapped transaction that can be used to submit, verify, and estimate gas for a transaction.
 */
class WrappedTransactionClass implements WrappedTransaction {
  /**
   * The populated transaction object.
   */
  readonly _transaction: PopulatedTransaction;
  /**
   * The ethers.js contract instance.
   */
  readonly _contract?: TOKEN_POOL_CONTRACTS;
  signer: SignerOrProvider;

  /**
   * Creates a new wrapped transaction instance.
   * @param transaction The populated transaction object.
   * @param contract The ethers.js contract instance.
   */
  constructor(
    transaction: PopulatedTransaction,
    contract: TOKEN_POOL_CONTRACTS,
    signerOrProvider: SignerOrProvider
  ) {
    this._transaction = transaction;
    this._contract = getPoolContract(contract);
    this.signer = signerOrProvider;
  }

  /**
   * Verifies that the transaction can be executed by estimating its gas cost.
   * @returns A Promise that resolves to the estimated gas cost.
   * @throws {@link SdkError} An SDK error if the transaction execution failed and the error reason can be identified.
   * @throws The original error if the transaction execution failed and the error reason cannot be identified.
   */
  async verify() {
    try {
      const gasEstimate = await this._contract?.provider.estimateGas(this._transaction);
      console.log(`gasEstimate:`, gasEstimate);
      if (!gasEstimate) {
        throw new SdkError('Gas estimate is undefined');
      }
      return gasEstimate;
    } catch (error: any) {
      console.error(`error:`, error);
      if (this._contract) {
        const reason = this.parseNodeError(this._contract, error);
        throw new SdkError(reason, error);
      }
    }
    return BigNumber.from(0);
  }

  /**
   * Submits the transaction to the blockchain using the signer.
   * @returns The transaction receipt.
   */
  async submitResponse() {
    const txWithAdjustedGas = {
      ...this._transaction,
      gasLimit: BigNumber.from(this._transaction.gasPrice).mul(GAS_MULTIPLIER),
    };
    const tx = await this._contract?.signer.sendTransaction(txWithAdjustedGas);
    console.log(`tx:`, tx);
    if (!tx) {
      throw new SdkError('Transaction response is undefined');
    }
    return tx;
  }

  /**
   * Submits the transaction to the blockchain and waits for it to be mined.
   * @param confirmations The number of confirmations to wait for (default is 1).
   * @returns A Promise that resolves to the transaction receipt.
   */
  async submit(confirmations?: number) {
    const response = await this.submitResponse();
    return await response.wait(confirmations);
  }

  /**
   * Estimates gas, submits a transaction with gas estimate, and waits for the
   * node to acknowledge the transaction is pending.
   * @throws {@link SdkError} if transaction will fail at current block height.
   * @returns TransactionResponse
   */
  async verifyAndSubmitResponse(contract?: TOKEN_POOL_CONTRACTS) {
    const estimatedGas = await this.verify();
    const txWithAdjustedGas = {
      ...this._transaction,
      gasLimit: +estimatedGas.mul(GAS_MULTIPLIER),
    };
    const c = contract || this._contract;
    const tx = await c?.signer.sendTransaction(txWithAdjustedGas);
    if (!tx) {
      throw new SdkError(`Transaction response is undefined`);
    }
    return this.submitResponse();
  }

  /**
   * Estimates gas, submits a transaction with gas estimate, and waits for the transaction to be
   * included in a block.
   * @param confirmations Optionally wait for specific number of confirmations.
   * @throws {@link SdkError} if transaction will fail at current block height.
   * @returns TransactionReceipt
   */
  async verifyAndSubmit(confirmations?: number) {
    const response = await this.verifyAndSubmitResponse();
    return await response.wait(confirmations);
  }

  /**
   * Looks through exception data to find the error hash for various node providers.
   * @param error Error thrown by Ethers in response to an estimateGas failure.
   * @returns string
   */
  parseNodeError(contract: TOKEN_POOL_CONTRACTS, error: any) {
    if (error?.error?.error) {
      const innerError = error.error.error;
      // works on mainnet-forked Ganache local testnet
      if (innerError.data?.reason) return innerError.data.reason;
      if (innerError.data?.result) {
        const errorHash = innerError.data.result;
        return this.getCustomErrorFromHash(contract, errorHash);
      }
      // works with Alchemy node on Goerli
      if (innerError.code === 3) {
        // if the hash does not map to a custom error, return the node-provided error
        const errorHash = innerError.data;
        return this.getCustomErrorFromHash(contract, errorHash) ?? error.error.error;
      }
    }
    return 'Revert reason unknown';
  }

  /**
   * Matches error hash from node with custom errors in contract.
   * @param contract Instance of contract with interface prepared from ABI.
   * @param errorData Error hash string parsed from exception raised by node.
   * @returns Human-readable reason explaining why transaction would revert.
   */
  getCustomErrorFromHash(contract: TOKEN_POOL_CONTRACTS, errorData: string) {
    // retrieve the list of custom errors available to the contract
    const customErrorNames = Object.keys(contract.interface.errors);

    // index the contract's errors by the first 8 bytes of their hash
    const errorsByHash = customErrorNames.reduce((acc: any, name: string) => {
      return {
        ...acc,
        [contract.interface.getSighash(name)]: name,
      };
    }, {});

    if (errorData in errorsByHash) {
      return errorsByHash[errorData];
    } else {
      return undefined;
    }
  }
}

export { WrappedTransactionClass };
