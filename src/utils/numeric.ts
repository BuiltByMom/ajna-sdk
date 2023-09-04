import { BigNumber, BigNumberish, constants, ethers } from 'ethers';
import { unchecked, uint256, Uint, type } from 'solidity-math';
import { ONE_HALF_WAD, ONE_WAD } from '../constants/common';

// converts from WAD precision to human-readable string
export const fromWad = (value: BigNumberish): string => {
  return ethers.utils.formatEther(String(value));
};

// converts from human-readable value to WAD precision
export const toWad = (value: BigNumberish): BigNumber => {
  return ethers.utils.parseUnits(String(value), 'ether');
};

export const wadToUint = (wad: BigNumberish): Uint => {
  return uint256(wad.toString());
};

// calculates product of two WADs
export const wmul = (lhs: BigNumber, rhs: BigNumber): BigNumber => {
  // (x * y + WAD / 2) / WAD;
  return lhs.mul(rhs).add(ONE_HALF_WAD).div(constants.WeiPerEther);
};

// calculates quotient of two WADs
export const wdiv = (lhs: BigNumber, rhs: BigNumber): BigNumber => {
  // return (x * WAD + y / 2) / y;
  return lhs
    .mul(constants.WeiPerEther)
    .add(rhs.div(BigNumber.from(2)))
    .div(rhs);
};

// returns the minimum of two WADs
export const min = (lhs: BigNumber, rhs: BigNumber): BigNumber => (lhs.lte(rhs) ? lhs : rhs);

// returns the maximum of two WADs
export const max = (lhs: BigNumber, rhs: BigNumber): BigNumber => (lhs.gte(rhs) ? lhs : rhs);

export const wadToIntRoundingDown = (wad: BigNumber): number => {
  return wdiv(wad, ONE_WAD).div(ONE_WAD).toNumber();
};

// https://github.com/gabrielfu/solidity-math#muldiv
// Alternative implementation: https://ethereum.stackexchange.com/questions/106648/best-approach-to-replicate-a-complex-piece-of-solidity-code-in-javascript-typesc
export function muldiv(a: Uint, b: Uint, denominator: Uint) {
  if (!denominator.gt(0)) {
    throw new Error();
  }

  const mm = unchecked(() => a.mulmod(b, type(uint256).max));
  let prod0 = a.mul(b);
  let prod1 = mm.sub(prod0).sub(a.lt_(b));

  if (prod1.eq(0)) {
    return prod0.div(denominator);
  }

  if (!prod1.lt(denominator)) {
    throw new Error();
  }

  const remainder = unchecked(() => a.mulmod(b, denominator));
  prod1 = prod1.sub(remainder.gt_(prod0));
  prod0 = prod0.sub(remainder);

  let twos = uint256(0);
  // -x for uint256 is disabled since 0.8.0
  // so we need unchecked mode
  unchecked(() => {
    twos = uint256(0).sub(denominator).and(denominator);
    denominator = denominator.div(twos);

    prod0 = prod0.div(twos);
    twos = uint256(0).sub(twos).div(twos).add(1);
  });

  prod0.ior(prod1.mul(twos));

  const inv = denominator.xor(2).mul(3);
  inv.imul(uint256(2).sub(denominator.mul(inv)));
  inv.imul(uint256(2).sub(denominator.mul(inv)));
  inv.imul(uint256(2).sub(denominator.mul(inv)));
  inv.imul(uint256(2).sub(denominator.mul(inv)));
  inv.imul(uint256(2).sub(denominator.mul(inv)));
  inv.imul(uint256(2).sub(denominator.mul(inv)));

  const result = prod0.mul(inv);
  return result;
}
