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
   * @returns transaction
   */
  async ajnaApprove(signer: Signer, allowance: BigNumber) {
    return await approveAjna(signer, allowance);
  }

  /**
   * Wrap signer's AJNA tokens and burn
   * @param signer address whose AJNA will be wrapped and burned
   * @param amount amount to wrap and burn
   * @returns transaction
   * @todo unit test waiting on rc7 testchain with BurnWrapper deployed
   */
  async wrapAndBurn(signer: Signer, amount: BigNumber): Promise<WrappedTransaction> {
    return await depositFor(signer, await signer.getAddress(), amount);
  }
}
