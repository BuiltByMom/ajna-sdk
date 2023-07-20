import { ethers, BigNumber, Signer, Contract } from 'ethers';
import erc721PoolFactoryAbi from 'abis/ERC721PoolFactory.json';
import { Config } from 'classes/Config';
import { Address, SignerOrProvider, TransactionOverrides } from 'types';
import checksumAddress from 'utils/checksum-address';
import { createTransaction } from 'utils';

export const getErc721PoolFactoryContract = (provider: SignerOrProvider) => {
  return new ethers.Contract(
    checksumAddress(Config.erc721PoolFactory),
    erc721PoolFactoryAbi,
    provider
  );
};

export function deployNFTPool(
  signer: Signer,
  collateralAddress: Address,
  tokenIds: Array<number>,
  quoteAddress: Address,
  interestRate: BigNumber,
  overrides?: TransactionOverrides
) {
  const contractInstance: Contract = getErc721PoolFactoryContract(signer);
  console.info('contractInstance', contractInstance);

  return createTransaction(
    contractInstance,
    { methodName: 'deployPool', args: [collateralAddress, quoteAddress, tokenIds, interestRate] },
    overrides
  );
}

export function getDeployedNFTPools(
  provider: SignerOrProvider,
  collateralAddress: Address,
  quoteAddress: Address,
  nonSubsetHash: string
): Promise<Address> {
  const contractInstance: Contract = getErc721PoolFactoryContract(provider);

  return contractInstance.deployedPools(nonSubsetHash, collateralAddress, quoteAddress);
}
