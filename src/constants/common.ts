import { utils } from 'ethers';

export const GAS_MULTIPLIER = 2;
export const GAS_LIMIT_MAX = 1500000;

export const MIN_FENWICK_INDEX = 1;
export const MAX_FENWICK_INDEX = 7388;
export const DEFAULT_TTL = 600;

export const MAX_SETTLE_BUCKETS = 10;

export const ERC20_NON_SUBSET_HASH = utils.keccak256(utils.toUtf8Bytes('ERC20_NON_SUBSET_HASH'));
