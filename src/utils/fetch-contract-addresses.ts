import axios from 'axios';
import { SdkError } from '../types';
import { ipfsAjnaContractAddressesURI } from '../constants';

/**
 * Interface representing the contract addresses for the Ajna protocol.
 */
export interface AjnaContractAddresses {
  AJNA_TOKEN: string;
  ERC20_POOL_FACTORY: string;
  ERC721_POOL_FACTORY: string;
  POOL_UTILS: string;
  POSITION_MANAGER: string;
  GRANT_FUND: string;
  BURN_WRAPPER: string;
}

/**
 * Fetches contract addresses for the specified network from IPFS.
 * @param network - The network to fetch contract addresses for.
 * @returns A Promise that resolves to an object containing contract addresses for the specified network.
 * @throws {SdkError} If the request to fetch contract addresses fails.
 * @throws {Error} If contract addresses are not found for the specified network.
 */
export async function fetchContractAddresses(
  network: 'mainnet' | 'goerli' | 'polygon'
): Promise<AjnaContractAddresses> {
  try {
    const json = await axios(ipfsAjnaContractAddressesURI);
    if (json.status !== 200) throw new Error('IPFS request failed');

    const { data } = json;
    if (!data[network]?.contracts)
      throw new Error(`Contract addresses not found for network ${network}`);

    return data[network].contracts;
  } catch (error: any) {
    throw new SdkError('Request to fetch contract addresses failed', error);
  }
}

fetchContractAddresses('goerli');
