import { ethers, BigNumber, Signer, Contract } from 'ethers';
import erc721PoolFactoryAbi from 'abis/ERC721PoolFactory.json';
import { Config } from 'classes/Config';
import { Address, SignerOrProvider, TransactionOverrides } from 'types';
import checksumAddress from 'utils/checksum-address';
import { createTransaction } from 'utils';

export const getErc721PoolFactoryContract = (provider: SignerOrProvider): Contract => {
  return new ethers.Contract(
    checksumAddress(Config.erc721PoolFactory),
    erc721PoolFactoryAbi,
    provider
  );
};

export async function deployPool(
  signer: Signer,
  collateralAddress: Address,
  tokenIds: Array<number>,
  quoteAddress: Address,
  interestRate: BigNumber,
  overrides?: TransactionOverrides
) {
  const contract: Contract = getErc721PoolFactoryContract(signer);

  return await createTransaction(
    contract,
    {
      methodName: 'deployPool(address,address,uint256[],uint256)',
      args: [collateralAddress, quoteAddress, tokenIds, interestRate],
    },
    overrides
  );
}

export async function getDeployedPools(
  provider: SignerOrProvider,
  collateralAddress: Address,
  quoteAddress: Address,
  subset: string
): Promise<Address> {
  const contract: Contract = getErc721PoolFactoryContract(provider);

  return await contract.deployedPools(subset, collateralAddress, quoteAddress);
}

export async function getSubsetHash(
  provider: SignerOrProvider,
  tokensIds: Array<BigNumber>
): Promise<string> {
  const contract: Contract = getErc721PoolFactoryContract(provider);

  return await contract.getNFTSubsetHash(tokensIds);
}
