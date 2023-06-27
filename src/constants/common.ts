import { BigNumber, utils } from 'ethers';
import { toWad } from '../utils/numeric';

// transaction management
export const GAS_MULTIPLIER = 2;
export const GAS_LIMIT_MAX = 1500000;

// pool calculations
export const ONE_PERCENT_WAD: BigNumber = toWad('0.01');

// pool interactions
export const ERC20_NON_SUBSET_HASH = utils.keccak256(utils.toUtf8Bytes('ERC20_NON_SUBSET_HASH'));
export const MIN_FENWICK_INDEX = 1;
export const MAX_FENWICK_INDEX = 7388;
export const DEFAULT_TTL = 600;
export const MAX_SETTLE_BUCKETS = 10;

// grants distribution period
export const ONE_DAY_MS = 3600 * 24 * 1000;
export const DISTRIBUTION_PERIOD_DURATION = 90 * ONE_DAY_MS;
