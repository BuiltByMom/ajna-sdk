import { BigNumber } from 'ethers';
import { approveAjna, depositFor, getBurnWrapperContract } from '../contracts/burn-wrapper';
import { BurnWrappedAjna, Signer, SignerOrProvider, WrappedTransaction } from '../types';

/** Allows AJNA tokens from mainnet to be wrapped and burned for moving across an L2 bridge. */
export class BurnWrapper {
  provider: SignerOrProvider;
  contract: BurnWrappedAjna;

  constructor(provider: SignerOrProvider) {
    this.provider = provider;
    this.contract = getBurnWrapperContract(this.provider);
  }

  /**
   * approve BurnWrapper to manage Ajna token
   * @param signer user
   * @param allowance approval amount (or MaxUint256)
   * @returns promise to transaction
   */
  async ajnaApprove(signer: Signer, allowance: BigNumber) {
    return approveAjna(signer, allowance);
  }

  /**
   * Wrap signer's AJNA tokens and burn
   * @param signer address whose AJNA will be wrapped and burned
   * @param amount amount to wrap and burn
   * @returns promise to transaction
   */
  async wrapAndBurn(signer: Signer, amount: BigNumber): Promise<WrappedTransaction> {
    return depositFor(signer, await signer.getAddress(), amount);
  }
}
