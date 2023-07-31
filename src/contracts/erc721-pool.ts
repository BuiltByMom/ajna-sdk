import { BigNumber, Contract, Signer, ethers } from 'ethers';
import { Contract as ContractMulti } from 'ethcall';
import { getNftContract } from './erc721';
import ERC721Pool from 'abis/ERC721Pool.json';
import { Address, SignerOrProvider, TransactionOverrides } from 'types';
import { createTransaction } from '../utils/transactions';

export const getErc721PoolContract = (poolAddress: Address, provider: SignerOrProvider) => {
  return new ethers.Contract(poolAddress, ERC721Pool, provider);
};

export const getErc721PoolContractMulti = (poolAddress: Address) => {
  return new ContractMulti(poolAddress, ERC721Pool);
};

export async function approve(
  signer: Signer,
  poolAddress: Address,
  tokenAddress: Address,
  tokenId: number,
  overrides?: TransactionOverrides
) {
  const contract = getNftContract(tokenAddress, signer);

  return await createTransaction(
    contract,
    { methodName: 'approve', args: [poolAddress, tokenId] },
    overrides
  );
}

export async function addCollateral(
  contract: Contract,
  tokenIds: Array<number>,
  bucketIndex: number,
  expiry?: number,
  overrides?: TransactionOverrides
) {
  return await createTransaction(
    contract,
    { methodName: 'addCollateral', args: [tokenIds, bucketIndex, expiry] },
    overrides
  );
}

// TODO: implement mergeOrRemoveCollateral once we have NFT liquidations and can test

export async function removeCollateral(
  contract: Contract,
  noOfNFTsToRemove: number,
  bucketIndex: number,
  overrides?: TransactionOverrides
) {
  return await createTransaction(
    contract,
    { methodName: 'removeCollateral', args: [noOfNFTsToRemove, bucketIndex] },
    overrides
  );
}

export async function drawDebt(
  contract: Contract,
  borrowerAddress: Address,
  amountToBorrow: BigNumber,
  limitIndex: number,
  tokenIdsToPledge: Array<number>,
  overrides?: TransactionOverrides
) {
  return await createTransaction(
    contract,
    {
      methodName: 'drawDebt',
      args: [borrowerAddress, amountToBorrow, limitIndex, tokenIdsToPledge],
    },
    overrides
  );
}

export async function repayDebt(
  contract: Contract,
  borrowerAddress: Address,
  maxQuoteTokenAmountToRepay: BigNumber,
  noOfNFTsToPull: number,
  collateralReceiver: Address,
  limitIndex: number,
  overrides?: TransactionOverrides
) {
  return await createTransaction(
    contract,
    {
      methodName: 'repayDebt',
      args: [
        borrowerAddress,
        maxQuoteTokenAmountToRepay,
        noOfNFTsToPull,
        collateralReceiver,
        limitIndex,
      ],
    },
    overrides
  );
}
