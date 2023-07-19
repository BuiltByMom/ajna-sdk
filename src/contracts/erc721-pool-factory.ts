import { ethers, BigNumber, Signer, Contract } from 'ethers';
import erc721PoolFactoryAbi from '../abis/ERC721PoolFactory.json';
import { Config } from '../classes/Config';
import { Address, SignerOrProvider, TransactionOverrides } from '../types';
import { createTransaction } from '../utils';
import checksumAddress from '../utils/checksum-address';

export const getErc721PoolFactoryContract = (provider: SignerOrProvider) => {
  return new ethers.Contract(
    checksumAddress(Config.erc721PoolFactory),
    erc721PoolFactoryAbi,
    provider
  );
};

export async function deployNFTPool(
  signer: Signer,
  collateralAddress: Address,
  tokenIds: Array<number>,
  quoteAddress: Address,
  interestRate: BigNumber,
  overrides?: TransactionOverrides
) {
  const contractInstance: Contract = getErc721PoolFactoryContract(signer);

  return await createTransaction(
    contractInstance,
    { methodName: 'deployPool', args: [collateralAddress, quoteAddress, tokenIds, interestRate] },
    overrides
  );
}
