import { BigNumber, Signer, constants } from 'ethers';
import { Address, PoolInfoUtils, SignerOrProvider } from '../types';
import { kickReserveAuction, takeReserves } from '../contracts/pool';
import { toWad, wmul } from '../utils/numeric';
import { ErcPool } from 'types/typechain';

export interface CRAStatus {
  /** time a reserve auction was last kicked */
  lastKickTime: Date;
  /** amount of Ajna token to burn in exchange of total auction reseves */
  ajnaToBurn: BigNumber;
  /** the amount of excess quote tokens */
  reserves: BigNumber;
  /** denominated in quote token, or `0` if no reserves can be auctioned */
  claimableReserves: BigNumber;
  /** amount of claimable reserves which has not yet been taken */
  claimableReservesRemaining: BigNumber;
  /** current price at which `1` quote token may be purchased, denominated in `Ajna` */
  price: BigNumber;
}

/**
 * Models a pool's claimable reserve auction (CRA)
 */
export class ClaimableReserveAuction {
  provider: SignerOrProvider;
  contract: ErcPool;
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
    contract: ErcPool,
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
  async getStatus(): Promise<CRAStatus> {
    const reservesInfoCall = this.contractUtils.poolReservesInfo(this.poolAddress);
    const kickTimeCall = this.contract.reservesInfo();
    const [reservesInfoResponse, kickTimeResponse] = await Promise.all([
      reservesInfoCall,
      kickTimeCall,
    ]);
    const [reserves, claimableReserves, claimableReservesRemaining, price] = reservesInfoResponse;
    const [, , lastKickTimestamp] = kickTimeResponse;

    const ajnaToBurn = wmul(claimableReservesRemaining, price).add(toWad(1));

    return {
      lastKickTime: new Date(lastKickTimestamp.toNumber()),
      ajnaToBurn,
      reserves,
      claimableReserves,
      claimableReservesRemaining,
      price,
    };
  }

  /**
   * defines if auction is ongoing
   * @returns boolean that defines if auction is ongoing
   */
  async isTakeable() {
    const reservesInfoCall = this.contractUtils.poolReservesInfo(this.poolAddress);
    const kickTimeCall = this.contract.reservesInfo();
    const [reservesInfoResponse, kickTimeResponse] = await Promise.all([
      reservesInfoCall,
      kickTimeCall,
    ]);
    const [, , claimableReservesRemaining, , timeRemaining] = reservesInfoResponse;
    const [, , lastKickTimestamp] = kickTimeResponse;

    const kickTime = BigNumber.from(lastKickTimestamp).mul(1000);
    const isKicked = kickTime.gt(0);
    const reservesRemaining = claimableReservesRemaining.gt(0);
    const expired = timeRemaining.eq(0);

    return isKicked && reservesRemaining && !expired;
  }
}
