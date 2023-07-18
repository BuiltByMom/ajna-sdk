import { providers } from 'ethers';
import { addAccountFromKey, addAccountFromKeystore } from '../src/utils/add-account';
import { Config, networks } from '../src/constants';
import { AjnaSDK } from '../src/classes/AjnaSDK';

export enum Networks {
  Mainnet = 'mainnet',
  Goerli = 'goerli',
  Aditi = 'aditi',
}

export type Network = Networks.Mainnet | Networks.Goerli | Networks.Aditi;
export type Actor = 'lender' | 'borrower' | 'voter';

function getRpcUrl(network: Network = Networks.Goerli) {
  return networks[network].rpcUrl;
}

export async function getProviderSigner(
  network: Network = Networks.Goerli,
  actor: Actor = 'lender'
) {
  const provider = new providers.JsonRpcProvider(getRpcUrl(network));

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

export async function initAjna(actor: Actor = 'lender', network?: Network) {
  const selectedNetwork = network
    ? network
    : process.env.ETH_NETWORK === 'mainnet'
    ? Networks.Mainnet
    : Networks.Goerli;

  console.log('Selected Network:', selectedNetwork);

  const { provider, signer } = await getProviderSigner(selectedNetwork, actor);

  Config.fromEnvironment(selectedNetwork);

  const ajna = new AjnaSDK(provider);

  return {
    ajna,
    provider,
    signer,
  };
}
