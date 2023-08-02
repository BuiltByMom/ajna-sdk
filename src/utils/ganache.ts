import { providers } from 'ethers';

export async function takeSnapshot(provider: providers.JsonRpcProvider) {
  return +(await provider.send('evm_snapshot', []));
}

export async function mine(provider: providers.JsonRpcProvider, blocks = 1) {
  // HACK: https://github.com/trufflesuite/ganache/issues/4409
  while (blocks > 100_000) {
    await provider.send('evm_mine', [{ blocks: 100_000 }]);
    blocks -= 100_000;
  }
  await provider.send('evm_mine', [{ blocks: blocks }]);
}

// NOTE: due to API limitation, same snapshot couldn't be used twice for reverting
export async function revertToSnapshot(provider: providers.JsonRpcProvider, id: number) {
  const retval = !!(await provider.send('evm_revert', [id]));
  await mine(provider);
  return retval;
}

export async function timeJump(provider: providers.JsonRpcProvider, seconds: number) {
  await provider.send('evm_increaseTime', [seconds]);
  await mine(provider);
}
