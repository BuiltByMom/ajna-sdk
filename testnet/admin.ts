#!/usr/bin/env ts-node

import dotenv from 'dotenv';
import { BigNumber, Signer, Wallet, providers } from 'ethers';
import { AjnaSDK } from '../src/classes/AjnaSDK';
import { Config } from '../src/classes/Config';
import { fromWad, mine, toWad } from '../src/utils';
import { getAjnaBalance, transferAjna } from '../src/contracts/erc20';
import { input } from '@inquirer/prompts';
import { Address } from '../src/types';
import { DistributionPeriod } from '../src/classes/DistributionPeriod';
import { getProposalIdFromReceipt } from '../src/contracts/grant-fund';

dotenv.config({ path: './testnet/.env' });
const provider = new providers.JsonRpcProvider(process.env.ETH_RPC_URL);
Config.fromEnvironment();
const ajna = new AjnaSDK(provider);

const mainMenuAsciiArt = `

┏┳┓              ┓   •
 ┃ ┏┓┏╋┏┓┏┓╋  ┏┓┏┫┏┳┓┓┏┓
 ┻ ┗ ┛┗┛┗┗ ┗  ┗┻┗┻┛┗┗┗┛┗

`;

const mainMenuOptions = `
Please enter one of the options below:
- 1: delegates vote from signer to address
- 2: get delegates for address
- 3: get treasury
- 4: get total supply
- 5: start a distribution period
- 6: get distrituion period
- 7: get voting power for address
- 8: get ETH/AJNA balances
- 10: transfer AJNA
- 11: create proposal
- 12: cast votes
- 13: get proposals
- 14: get top ten proposals
- 15: update top slate
- 16: get funded proposal slate
- 17: execute proposal
- 18: claim rewards
- 19: get rewards info

- 9: mine: mine a given number of blocks
- 0: exit
`;

const publicKeys = [
  '0xbC33716Bb8Dc2943C0dFFdE1F0A1d2D66F33515E',
  '0xD293C11Cd5025cd7B2218e74fd8D142A19833f74',
  '0xb240043d57f11a0253743566C413bB8B068cb1F2',
  '0x6f386a7a0EF33b7927bBF86bf06414884a3FDFE5',
  '0x122230509E5bEEd0ea3c20f50CC87e0CdB9d7e1b',
  '0xB932C1F1C422D39310d0cb6bE57be36D356fc0c8',
  '0x9A7212047c046a28E699fd8737F2b0eF0F94B422',
  '0x7CA0e91795AD447De38E4ab03b8f1A829F38cA58',
  '0xd21BB9dEF715C0E7A1b7F18496F2475bcDeFA1Be',
  '0xef62E4A54bE04918f435b7dF83c01138521C009b',
  '0xAecE01e5Ba6B171455B97FBA91b33E1b138AF60c',
  '0x9D3904CD72d3BDb97C3B2e266A60aBe127B6F940',
  '0x2636aD85Da87Ff3780e1eC5e48fC0aBa33849B16',
  '0x81fFF6A381bF1aC11ed388124186C177Eb8623f4',
  '0x8596d963e0DEBCa873A56FbDd2C9d119Aa0eB443',
  '0xeeDC2EE00730314b7d7ddBf7d19e81FB7E5176CA',
];

const privateKeys = [
  '0x2bbf23876aee0b3acd1502986da13a0f714c143fcc8ede8e2821782d75033ad1',
  '0x997f91a295440dc31eca817270e5de1817cf32fa99adc0890dc71f8667574391',
  '0xf456f1fa8e9e7ec4d24f47c0470b7bb6d8807ac5a3a7a1c5e04ef89a25aa4f51',
  '0x6b7f753700a3fa90224871877bfb3d6bbd23bd7cc25d49430ce7020f5e39d463',
  '0xaf12577dbd6c3f4837fe2ad515009f9f71b03ce8ba4a59c78c24fb5f445b6d01',
  '0x8b4c4ea4246dd9c3404eda8ec30145dbe9c23744876e50b31dc8e9a0d26f0c25',
  '0x061d84e8c34b8505b1cefae91de5204c680ed9b241da051a2d8bdcad4393c24b',
  '0xe15dec57b7eb7bb736b6e9d8501010ca5973ee3027b6ecb567f76fa89a6e9716',
  '0xe5fe199c1ac195ee83fa28dd7bbb12c6bed2ebe6a1f76e55b0b318373c42059d',
  '0xdb95f6b72665d069dd2776d1c747d1ab2ee9184b26da57e3f4708acc5595aa79',
  '0x2739db52256c7aa7aabab565d312bbd41c011fe8840b814ba6897929d274abed',
  '0x1d612f43a142a29d0efb31b51b16d49c68d3b0efff47d39088d38a6ee402204a',
  '0xc748c58b01eb90e347f869b9dab9ec78613d6cd87e334204424727a363295cab',
  '0xfd4ea1b995ed10c8614c1f43cbd478dff72e8cc64b715131ec4fbba795e08fff',
  '0x447bca6c40103b20b6a63bc967f379819cd8f82436ecb54704b3fd8011e74d00',
  '0xd332a346e8211513373b7ddcf94b2b513b934b901258a9465c76d0d9a2b676d8',
];

const checkRequiredEnv = () => {
  const requiredValues = ['ETH_RPC_URL', 'AJNA_TOKEN_ADDRESS', 'AJNA_GRANT_FUND'];
  const errors: Array<string> = [];
  for (const key of requiredValues) {
    const value = process.env[key];
    if (value === undefined || value === '') {
      errors.push(key);
    }
  }
  if (errors.length > 0) {
    throw new Error(
      `Improperly configured: the following environment variables are missing ${errors.join(', ')}`
    );
  }
};

const numberOfAccounts = publicKeys.length;
const indexOptions = `(0-${numberOfAccounts - 1})`;

const getIndexByAddress = (address: string) => publicKeys.indexOf(address);

const getWalletByIndex = (index: number): Wallet => {
  return new Wallet(privateKeys[index], provider);
};

const getAddressByIndex = (index: number): string => publicKeys[index];

// use the last address to sign transactions by default
const defaultSigner = getWalletByIndex(privateKeys.length - 1);

async function delegateVote(voter: Signer, delegatee: string) {
  const tx = await ajna.grants.delegateVote(voter, delegatee);
  const receipt = await tx.verifyAndSubmit();
  console.log('tx receipt', receipt);
}

const handleDelegateVote = async () => {
  const delegatorIndex = await input({ message: `Select a delegator by index ${indexOptions}` });
  const delegateeIndex = await input({ message: `Select a delegatee by index ${indexOptions}` });
  const delegator = getWalletByIndex(Number(delegatorIndex));
  const delegatee = getAddressByIndex(Number(delegateeIndex));
  await delegateVote(delegator, delegatee);
  console.log(
    `delegated vote from ${delegator.address} (${getIndexByAddress(
      delegator.address
    )}) to ${delegatee} (${getIndexByAddress(delegatee)})`
  );
};

const handleGetDelegates = async () => {
  const addressIndex = await input({ message: `Select an address (or press enter to view all):` });
  const printAdressDelegation = async (address: string) => {
    const result = await ajna.grants.getDelegates(address);
    console.log(
      `Adress ${address} (${getIndexByAddress(
        address
      )}) delegates to: ${result} (${getIndexByAddress(result)})`
    );
  };
  if (addressIndex === '') {
    for (const address of publicKeys) {
      await printAdressDelegation(address);
    }
  } else {
    const address = getAddressByIndex(Number(addressIndex));
    await printAdressDelegation(address);
  }
};

const handleGetTreasury = async () => {
  const result = await ajna.grants.getTreasury();
  console.log(`Treasury: ${fromWad(result)} AJNA`);
};

const getTotalSupply = async () => {
  const result = await ajna.grants.getTotalSupply();
  console.log(`Total supply: ${fromWad(result)} AJNA`);
};

const handleStartDistributionPeriod = async () => {
  const tx = await ajna.grants.startNewDistributionPeriod(defaultSigner);
  const receipt = await tx.verifyAndSubmit();
  console.log('tx receipt', receipt);
  console.log('Distribution period started');
};

const handleGetDistributionPeriod = async () => {
  const id = await input({
    message: 'Enter distribution period id (or press enter to get the active distribution period)',
  });
  const dp = await (id === ''
    ? ajna.grants.getActiveDistributionPeriod()
    : ajna.grants.getDistributionPeriod(Number(id)));
  console.log(dp?.toString());
  console.log(`stage: ${await dp?.distributionPeriodStage()}`);
};

const printVotingPower = async (dp: DistributionPeriod, address: string) => {
  const votingPower = await dp.getVotingPower(address);
  console.log(`${fromWad(votingPower)} for address ${address} (${getIndexByAddress(address)})`);
};

const handleGetVotingPower = async () => {
  const dp = await ajna.grants.getActiveDistributionPeriod();
  // hint: if voting power is 0, make sure that you delegated 33 blocks before the current DP started and that the delegator has AJNA to delegate
  const addressIndex = await input({ message: `Select an address (or press enter to view all):` });
  if (dp) {
    if (addressIndex === '') {
      for (const address of publicKeys) {
        await printVotingPower(dp, address);
      }
    } else {
      const address = getAddressByIndex(Number(addressIndex));
      await printVotingPower(dp, address);
    }
  }
};

const printBalance = async (address: string) => {
  const [ethBalance, ajnaBalance] = await Promise.all([
    provider.getBalance(address),
    getAjnaBalance(provider, address),
  ]);
  console.log(
    `address ${address} (${getIndexByAddress(address)}) has ${fromWad(ethBalance)} ETH, ${fromWad(
      ajnaBalance
    )} AJNA`
  );
};

const handleGetBalances = async () => {
  const addressIndex = await input({ message: `Select an address (or press enter to view all):` });
  if (addressIndex === '') {
    for (const address of publicKeys) {
      await printBalance(address);
    }
  } else {
    const address = getAddressByIndex(Number(addressIndex));
    await printBalance(address);
  }
};

const handleTransfer = async () => {
  const fromAddressIndex = await input({ message: `Select a from address` });
  const toAddressIndex = await input({ message: `Select a to address` });
  const amount = await input({ message: `Select an AJNA amount:` });
  const fromWallet = getWalletByIndex(Number(fromAddressIndex));
  const toAdress = getAddressByIndex(Number(toAddressIndex));
  const tx = await transferAjna(fromWallet, toAdress, toWad(Number(amount)));
  const receipt = await tx.verifyAndSubmit();
  console.log(receipt);
  console.log(`balances after transfer:`);
  await printBalance(fromWallet.address);
  await printBalance(toAdress);
};

const handlePropose = async () => {
  const title = await input({ message: `Enter a title` });
  const recipientAddresses: Array<{
    address: Address;
    amount: string;
  }> = [];
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const canSkip = recipientAddresses.length >= 1;
    const skipText = '(or press enter to continue)';
    const addressIndex = await input({
      message: `Select a recipient address ${indexOptions} ${canSkip ? skipText : ''}`,
    });
    if (addressIndex === '' && canSkip) {
      break;
    }
    const amount = await input({ message: `Enter an amount for this address` });
    recipientAddresses.push({
      address: getAddressByIndex(Number(addressIndex)),
      amount,
    });
  }
  const externalLink = await input({
    message: `Enter an external link (or press enter to leave blank)`,
  });
  const ipfsHash = await input({ message: `Enter an ipfsHash (or press enter to leave blank)` });
  const arweaveTxid = await input({
    message: `Enter an arweaveTxid (or press enter to leave blank)`,
  });

  const params = {
    title,
    recipientAddresses,
    externalLink,
    ipfsHash,
    arweaveTxid,
  };

  const tx = await ajna.grants.createProposal(defaultSigner, params);
  const receipt = await tx.verifyAndSubmit();
  console.log('tx receipt', receipt);
  console.log(`Proposal created with id: ${getProposalIdFromReceipt(receipt)}`);
};

const handleVote = async () => {
  const dp = await ajna.grants.getActiveDistributionPeriod();
  const votesToCast: Array<[string, string]> = [];
  const addressIndex = await input({ message: `Select a voter address ${indexOptions}` });
  const voterAddress = getAddressByIndex(Number(addressIndex));
  const voter = getWalletByIndex(Number(addressIndex));
  if (dp) {
    await printVotingPower(dp, voterAddress);
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const canSkip = votesToCast.length >= 1;
      const skipText = '(or press enter to continue)';
      const proposalId = await input({
        message: `Enter a proposal id ${canSkip ? skipText : ''}`,
      });
      if (proposalId === '' && canSkip) {
        break;
      }
      const numberOfVotes = await input({ message: `Enter the number of votes for this proposal` });
      votesToCast.push([proposalId, numberOfVotes]);
    }
    const tx = await dp.castVotes(voter, votesToCast);
    const receipt = await tx.verifyAndSubmit();
    console.log('tx receipt', receipt);
    console.log('Votes cast');
  }
};

const handleGetProposal = async () => {
  const proposalId = await input({ message: 'Enter proposalId' });
  const id = BigNumber.from(proposalId);
  const proposal = await ajna.grants.getProposal(id);
  console.log(await proposal.getInfo());
};

const handleGetTopTenProposals = async () => {
  const dp = await ajna.grants.getActiveDistributionPeriod();
  if (dp) {
    const toptenproposals = await dp.getTopTenProposals();
    toptenproposals.forEach((proposalId, index) => {
      console.log(`proposal ${index + 1}: ${proposalId}`);
    });
  }
};

const handleUpdateSlate = async () => {
  const dp = await ajna.grants.getActiveDistributionPeriod();
  const proposals: Array<string> = [];
  if (dp) {
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const canSkip = proposals.length >= 1;
      const skipText = '(or press enter to continue)';
      const proposalId = await input({
        message: `Enter a proposal id ${canSkip ? skipText : ''}`,
      });
      if (proposalId === '' && canSkip) {
        break;
      }
      proposals.push(proposalId);
    }
    const tx = await dp?.updateSlate(defaultSigner, proposals);
    const receipt = await tx.verifyAndSubmit();
    console.log('tx receipt', receipt);
    console.log('Slate updated');
  }
};

const handleGetFundedProposalSlate = async () => {
  const dp = await ajna.grants.getActiveDistributionPeriod();
  if (dp) {
    const fundedProposals = await dp.getFundedProposalSlate();
    fundedProposals.forEach((proposalId, index) => {
      console.log(`proposal ${index + 1}: ${proposalId}`);
    });
  }
};

const handleExecuteProposal = async () => {
  const description = await input({ message: `Enter proposal description` });
  const params: Array<{
    calldata: string;
  }> = [];
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const canSkip = params.length >= 1;
    const skipText = '(or press enter to continue)';
    const calldata = await input({
      message: `Enter calldata ${canSkip ? skipText : ''}`,
    });
    if (calldata === '' && canSkip) {
      break;
    }
    params.push({
      calldata,
    });
  }

  const executeParams = {
    description,
    params,
  };

  const tx = await ajna.grants.executeProposal(defaultSigner, executeParams);
  const receipt = await tx.verifyAndSubmit();
  console.log('tx receipt', receipt);
  console.log('Proposal executed');
};

const handleClaimRewards = async () => {
  const addressIndex = await input({ message: `Select a voter address ${indexOptions}` });
  const voter = getWalletByIndex(Number(addressIndex));
  const distributionId = await input({ message: `Enter distribution ID` });

  const tx = await ajna.grants.claimDelegateReward(voter, Number(distributionId));
  const receipt = await tx.verifyAndSubmit();
  console.log('tx receipt', receipt);
  console.log('Rewards claimed');
};

const handleGetRewardsInfo = async () => {
  const distributionId = await input({ message: `Enter distribution ID` });
  const addressIndex = await input({ message: `Select a voter address ${indexOptions}` });
  const voter = getAddressByIndex(Number(addressIndex));

  const hasClaimedReward = await ajna.grants.getHasClaimedRewards(Number(distributionId), voter);
  const delegateReward = await ajna.grants.getDelegateReward(Number(distributionId), voter);
  console.log(`Has claimed reward?: ${hasClaimedReward}`);
  console.log(`Delegate reward accrued: ${fromWad(delegateReward)}`);
};

const handleMine = async () => {
  console.log(`Current block: ${await provider.getBlockNumber()}`);
  console.log(
    'hints: mine 648.000 blocks to force the active distribution period to become unactive'
  );
  const numberOfBlocks = await input({ message: 'Enter the number of blocks' });
  console.log('Mining started, please wait...');
  await mine(provider, Number(numberOfBlocks), 10_000, remainingBlocks => {
    console.log(`${remainingBlocks} remaining blocks to be mined`);
  });
  console.log(`Current block after mine: ${await provider.getBlockNumber()}`);
  console.log(`${numberOfBlocks} mined`);
};

const executeOption = async (option: string) => {
  switch (option) {
    case '1':
      await handleDelegateVote();
      break;
    case '2':
      await handleGetDelegates();
      break;
    case '3':
      await handleGetTreasury();
      break;
    case '4':
      await getTotalSupply();
      break;
    case '5':
      await handleStartDistributionPeriod();
      break;
    case '6':
      await handleGetDistributionPeriod();
      break;
    case '7':
      await handleGetVotingPower();
      break;
    case '8':
      await handleGetBalances();
      break;
    case '10':
      await handleTransfer();
      break;
    case '11':
      await handlePropose();
      break;
    case '12':
      await handleVote();
      break;
    case '13':
      await handleGetProposal();
      break;
    case '14':
      await handleGetTopTenProposals();
      break;
    case '15':
      await handleUpdateSlate();
      break;
    case '16':
      await handleGetFundedProposalSlate();
      break;
    case '17':
      await handleExecuteProposal();
      break;
    case '18':
      await handleClaimRewards();
      break;
    case '19':
      await handleGetRewardsInfo();
      break;
    case '9':
      await handleMine();
      break;
    case '0':
      process.exit(0);
    // eslint-disable-next-line no-fallthrough
    default:
      console.log('Invalid option, please try again');
  }
};

const main = async () => {
  checkRequiredEnv();
  console.log(mainMenuAsciiArt);
  // eslint-disable-next-line no-constant-condition
  while (true) {
    console.log(mainMenuOptions);
    const option = await input({ message: 'option:' });
    // wrap execute in a loop so errors in specific handlers don't crash the admin
    try {
      await executeOption(option as string);
    } catch (e) {
      console.error(e);
    }
  }
};

main().catch(error => {
  console.error(error);
  process.exit(1);
});
