import dotenv from 'dotenv';
import { providers } from 'ethers';
import { AjnaSDK } from '../classes/ajna';
import { TEST_CONFIG as config } from '../constants/config';
import { addAccountFromKey } from '../utils/add-account';
import { toWad } from '../utils/numeric';
import './test-utils.ts';

dotenv.config();

jest.setTimeout(1200000);

const USDC_ADDRESS = '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48';
const USDT_ADDRESS = '0xdAC17F958D2ee523a2206206994597C13D831ec7';

describe('Transaction utils tests', () => {
  const provider = new providers.JsonRpcProvider(config.ETH_RPC_URL);
  const ajna = new AjnaSDK(provider);
  const signerLender = addAccountFromKey(config.LENDER_KEY, provider);

  it('should return wrapped transaction object', async () => {
    const tx = await ajna.factory.deployPool({
      signer: signerLender,
      collateralAddress: USDC_ADDRESS,
      quoteAddress: USDT_ADDRESS,
      interestRate: toWad('0.05'),
    });

    const response = await tx.verifyAndSubmit();

    expect(response).toBeDefined();
    expect(response.hash).not.toBe('');
    expect(response.from).toBe(signerLender.address);

    const receipt = await response.wait();

    expect(receipt).toBeDefined();
    expect(receipt.confirmations).toBe(1);
  });
});
