import { BigNumber, Contract, Signer, constants } from 'ethers';
import { Address, PoolInfoUtils, SignerOrProvider } from '../types';
import { kickReserveAuction, takeReserves } from '../contracts/pool';
import { toWad, wmul } from '../utils/numeric';

export interface CRAStats {
  /** amount of Ajna token to burn in exchange of total auction reseves */
  ajnaToBurn: BigNumber;
  /** the amount of excess quote tokens */
  reserves: BigNumber;
  /** denominated in quote token, or `0` if no reserves can be auctioned */
  claimableReserves: BigNumber;
  /** amount of claimable reserves which has not yet been taken */
  claimableReservesRemaining: BigNumber;
  /** current price at which `1` quote token may be purchased, denominated in `Ajna` */
  reserveAuctionPrice: BigNumber;
}

/**
 * Models a pool's claimable reserve auction (CRA)
 */
export class ClaimableReserveAuction {
  provider: SignerOrProvider;
  contract: Contract;
  contractUtils: PoolInfoUtils;
  poolAddress: Address;

  /**
   * @param provider JSON-RPC endpoint
   * @param contract pool contract reference
   * @param contractUtils PoolInfoUtils contract rererence
   * @param poolAddress identifies pool where claimable reserve auction is started
   */
  constructor(
    provider: SignerOrProvider,
    contract: Contract,
    contractUtils: PoolInfoUtils,
    poolAddress: Address
  ) {
    this.provider = provider;
    this.contract = contract;
    this.contractUtils = contractUtils;
    this.poolAddress = poolAddress;
  }

  /**
   *  purchases claimable reserves during a `CRA` using `Ajna` token
   *  @param maxAmount maximum amount of quote token to purchase at the current auction price
   *  @return actual amount of reserves taken.
   */
  async takeAndBurn(signer: Signer, maxAmount: BigNumber = constants.MaxUint256) {
    const contractPoolWithSigner = this.contract.connect(signer);

    return await takeReserves(contractPoolWithSigner, maxAmount);
  }

  /**
   *  called by actor to start a `Claimable Reserve Auction` (`CRA`)
   *  @param signer auction initiator
   *  @return transaction
   */
  async kick(signer: Signer) {
    const contractPoolWithSigner = this.contract.connect(signer);

    return await kickReserveAuction(contractPoolWithSigner);
  }

  /**
   * retrieves claimable reserve auction statistics
   * @returns {@link CRAStats}
   */
  async getStats(): Promise<CRAStats> {
    const data = await this.contractUtils.poolReservesInfo(this.poolAddress);

    const [reserves, claimableReserves, claimableReservesRemaining, auctionPrice] = data;

    const ajnaToBurn = wmul(claimableReservesRemaining, auctionPrice).add(toWad(1));

    return {
      ajnaToBurn,
      reserves,
      claimableReserves,
      claimableReservesRemaining,
      reserveAuctionPrice: auctionPrice,
    };
  }

  /**
   * defines if auction is ongoing
   * @returns boolean that defines if auction is ongoing
   */
  async isTakeable() {
    const kickTime = await this.getAuctionKickTime();
    const isKicked = kickTime.gt(0);

    const data = await this.contractUtils.poolReservesInfo(this.poolAddress);

    const [, , claimableReservesRemaining, , timeRemaining] = data;
    const reservesRemaining = claimableReservesRemaining.gt(0);
    const expired = timeRemaining.eq(0);

    return isKicked && reservesRemaining && !expired;
  }

  /**
   * returns auction kick timestamp
   * @returns auction kick timestamp
   */
  async getAuctionKickTime() {
    const [, , auctionKickTime] = await this.contract.reservesInfo();
    return BigNumber.from(auctionKickTime).mul(1000);
  }
}
