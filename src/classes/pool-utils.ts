import { SignerOrProvider } from '../constants/interfaces';
import {
  getPoolInfoUtilsContract,
  indexToPrice,
  priceToIndex,
} from '../contracts/pool-info-utils';
import { toWad } from '../utils/numeric';
import { BigNumberish, Contract } from 'ethers';

/**
 * Utilities which can be applied to any pool.
 */
class PoolUtils {
  provider: SignerOrProvider;
  contract: Contract;

  constructor(provider: SignerOrProvider) {
    this.provider = provider;
    this.contract = getPoolInfoUtilsContract(this.provider);
  }

  setup = (signer: SignerOrProvider) => {
    this.contract = getPoolInfoUtilsContract(signer);
  };

  priceToIndex = async (price: BigNumberish) => {
    return await priceToIndex({
      contract: this.contract,
      price: toWad(price),
    });
  };

  indexToPrice = async (index: number) => {
    return await indexToPrice({
      contract: this.contract,
      index,
    });
  };
}

export { PoolUtils };
