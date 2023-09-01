import { BigNumber, providers } from 'ethers';
import { addAccountFromKey, addAccountFromKeystore } from '../src/utils/add-account';
import { Config } from '../src/constants';
import { AjnaSDK } from '../src/classes/AjnaSDK';
import { fromWad } from '../src/utils';

export type Actor = 'lender' | 'borrower' | 'voter';

function getRpcUrl() {
  return process.env.ETH_RPC_URL;
}

export async function getProviderSigner(actor: Actor = 'lender') {
  const provider = new providers.JsonRpcProvider(getRpcUrl());

  let pkey = '',
    kstore = '',
    kstorepw = '';

  if (actor === 'lender') {
    pkey = process.env.LENDER_KEY || '';
    kstore = process.env.LENDER_KEYSTORE || '';
    kstorepw = process.env.LENDER_PASSWORD || '';
  } else if (actor === 'borrower') {
    pkey = process.env.BORROWER_KEY || '';
    kstore = process.env.BORROWER_KEYSTORE || '';
    kstorepw = process.env.BORROWER_PASSWORD || '';
  } else if (actor === 'voter') {
    pkey = process.env.VOTER_KEY || '';
    kstore = process.env.VOTER_KEYSTORE || '';
    kstorepw = process.env.VOTER_PASSWORD || '';
  }

  let signer;
  if (pkey !== '') {
    signer = addAccountFromKey(pkey, provider);
  } else {
    signer = await addAccountFromKeystore(kstore, provider, kstorepw);
  }
  return { provider, signer };
}

export async function initAjna(actor: Actor = 'lender') {
  const { provider, signer } = await getProviderSigner(actor);

  Config.fromEnvironment();

  const ajna = new AjnaSDK(provider);

  return {
    ajna,
    provider,
    signer,
  };
}

export function formatBNsInObjectFromWad(obj: any) {
  for (const key in obj) {
    if (BigNumber.isBigNumber(obj[key])) {
      obj[key] = fromWad(obj[key]);
    }
  }
  return obj;
}
