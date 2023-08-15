import { expect } from '@jest/globals';
import { BigNumber, providers } from 'ethers';
import { AjnaSDK } from '../classes/AjnaSDK';
import { TEST_CONFIG as config } from './test-constants';
import { submitAndVerifyTransaction } from './test-utils';
import { addAccountFromKey } from '../utils/add-account';
import { getAjnaTokenContract } from '../contracts/common';
import { toWad } from '../utils';

const USER5_KEY = '0x8b4c4ea4246dd9c3404eda8ec30145dbe9c23744876e50b31dc8e9a0d26f0c25';

describe('Burn wrapper', () => {
  const provider = new providers.JsonRpcProvider(config.ETH_RPC_URL);
  const ajna = new AjnaSDK(provider);
  const user = addAccountFromKey(USER5_KEY, provider);
  const ajnaToken = getAjnaTokenContract(provider);

  it('should wrap and burn AJNA token', async () => {
    // confirm user has AJNA token balance
    const balance: BigNumber = await ajnaToken.balanceOf(user.address);
    expect(balance.gt(toWad(0))).toBe(true);

    // test burn wrapper
    const burnWrapper = ajna.burnWrapper;
    let tx = await burnWrapper.ajnaApprove(user, balance);
    await submitAndVerifyTransaction(tx);
    tx = await burnWrapper.wrapAndBurn(user, balance);
    await submitAndVerifyTransaction(tx);
    expect(await ajnaToken.balanceOf(user.address)).toEqual(toWad(0));
    expect(await burnWrapper.contract.balanceOf(user.address)).toEqual(balance);
  });
});
