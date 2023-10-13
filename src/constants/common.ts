import { BigNumber, utils } from 'ethers';
import { DistributionPeriodStage } from '../types/classes';

// transaction management
export const GAS_MULTIPLIER = 2;
export const GAS_LIMIT_MAX = 1500000;

// fractions and percentages
export const ONE_PERCENT_WAD: BigNumber = BigNumber.from('10000000000000000');
export const ONE_HALF_WAD: BigNumber = BigNumber.from('500000000000000000');

// pool interactions
export const ERC20_NON_SUBSET_HASH = utils.keccak256(utils.toUtf8Bytes('ERC20_NON_SUBSET_HASH'));
export const MIN_FENWICK_INDEX = 1;
export const MAX_FENWICK_INDEX = 7388;
export const DEFAULT_TTL = 600;
export const MAX_SETTLE_BUCKETS = 10;

// grants distribution period
export const ONE_DAY_MS = 3600 * 24 * 1000;
export const DISTRIBUTION_PERIOD_DURATION = 90 * ONE_DAY_MS;
export const SCREENING_STAGE = utils.keccak256(
  utils.toUtf8Bytes(DistributionPeriodStage.SCREENING)
);
export const FUNDING_STAGE = utils.keccak256(utils.toUtf8Bytes(DistributionPeriodStage.FUNDING));
export const CHALLENGE_STAGE = utils.keccak256(
  utils.toUtf8Bytes(DistributionPeriodStage.CHALLENGE)
);

/**
 * The URI for the IPFS Ajna contract addresses JSON file.
 */
export const ipfsAjnaContractAddressesURI =
  'https://bafybeihryas6vtxla7pp7us22ko4e7bt7beorzmlp6cj7dvhhr3nvxhqjm.ipfs.sphn.link/ajna-contract-addresses.json';
