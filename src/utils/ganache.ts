import { providers } from 'ethers';

export async function takeSnapshot(provider: providers.JsonRpcProvider) {
  return +(await provider.send('evm_snapshot', []));
}

export async function revertToSnapshot(provider: providers.JsonRpcProvider, id: number) {
  return await provider.send('evm_revert', [id]);
}
