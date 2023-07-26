import { BigNumber } from 'ethers';
import { IDistributionPeriod, SignerOrProvider } from '../types';
import { ContractBase } from './ContractBase';

/**
 * Class used to iteract with distribution periods.
 */
export class DistributionPeriod extends ContractBase implements IDistributionPeriod {
  id: number;
  isActive: boolean;
  startBlock: number;
  startDate: number;
  endBlock: number;
  endDate: number;
  fundsAvailable: BigNumber;
  votesCount: BigNumber;

  constructor(
    signerOrProvider: SignerOrProvider,
    id: number,
    isActive: boolean,
    startBlock: number,
    startDate: number,
    endBlock: number,
    endDate: number,
    fundsAvailable: BigNumber,
    votesCount: BigNumber
  ) {
    super(signerOrProvider);
    this.id = id;
    this.isActive = isActive;
    this.startBlock = startBlock;
    this.startDate = startDate;
    this.endBlock = endBlock;
    this.endDate = endDate;
    this.fundsAvailable = fundsAvailable;
    this.votesCount = votesCount;
  }
}
