import { ethers, BigNumber, Signer, Contract } from 'ethers';
import erc721PoolFactoryAbi from '../abis/ERC721PoolFactory.json';
import { Config } from '../classes/Config';
import { Address, SignerOrProvider, TransactionOverrides } from '../types';
import checksumAddress from '../utils/checksum-address';
import { createTransaction } from '../utils';
import { keccak256 } from 'ethers/lib/utils';

export const getErc721PoolFactoryContract = (provider: SignerOrProvider): Contract => {
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

export function getSubsetHash(tokensIds: Array<BigNumber>): string {
  //keccak256('ERC721_NON_SUBSET_HASH')
  const ERC721_NON_SUBSET_HASH =
    '0x93e3b87db48beb11f82ff978661ba6e96f72f582300e9724191ab4b5d7964364';

  if (tokensIds.length == 0) return ERC721_NON_SUBSET_HASH;
  else {
    // check the array of token ids is sorted in ascending order
    // revert if not sorted
    for (let i = 0; i < tokensIds.length - 1; i++) {
      if (tokensIds[i].gte(tokensIds[i + 1])) throw new Error('Token ids must be sorted');
    }
    const abi = ethers.utils.defaultAbiCoder;

    // hash the sorted array of tokenIds
    return keccak256(abi.encode(['uint256[]'], [tokensIds]));
  }
}
