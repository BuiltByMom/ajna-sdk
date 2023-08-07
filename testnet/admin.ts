#!/usr/bin/env ts-node

import dotenv from 'dotenv';
import { Signer, Wallet, providers } from 'ethers';
import prompt from 'prompt';
import { AjnaSDK } from '../src/classes/AjnaSDK';
import { Config } from '../src/classes/Config';
import { fromWad, mine, toWad } from '../src/utils';
import { getBalance, transfer } from '../src/contracts/ajna-token';

dotenv.config({ path: './testnet/.env' });
const provider = new providers.JsonRpcProvider(process.env.ETH_RPC_URL);
Config.fromEnvironment();
const ajna = new AjnaSDK(provider);

prompt.start();

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
- 4: start a distribution period
- 5: get distrituion period
- 6: get voting power for address
- 7: get ETH/AJNA balances
- 8: transfer AJNA

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
  const errors: string[] = [];
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

const promptAsync = (args: string[]): Promise<prompt.Properties> =>
  new Promise((resolve, reject) => {
    prompt.get(args, (error, result) => {
      if (error) {
        reject(error);
        return;
      }
      resolve(result);
    });
  });

const handleDelegateVote = async () => {
  console.log(`Select a delegator and a delegatee address by index ${indexOptions}`);
  const { delegatorIndex, delegateeIndex } = await promptAsync([
    'delegatorIndex',
    'delegateeIndex',
  ]);
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
  console.log(`Select an address (or press enter to view all):`);
  const { addressIndex } = await promptAsync(['addressIndex']);
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

const handleStartDistributionPeriod = async () => {
  const tx = await ajna.grants.startNewDistributionPeriod(defaultSigner);
  const receipt = await tx.verifyAndSubmit();
  console.log('tx receipt', receipt);
  console.log('Distribution period started');
};

const handleGetDistributionPeriod = async () => {
  console.log(
    'Enter distribution period id (or press enter to get the active distribution period)'
  );
  const { id } = await promptAsync(['id']);
  const dp = await (id === ''
    ? ajna.grants.getActiveDistributionPeriod()
    : ajna.grants.getDistributionPeriod(Number(id)));
  console.log(dp.toString());
  console.log(`stage: ${await dp.distributionPeriodStage()}`);
};

const handleGetVotingPower = async () => {
  const dp = await ajna.grants.getActiveDistributionPeriod();
  console.log(`Select an address (or press enter to view all):`);
  // hint: if voting power is 0, make sure that you delegated 33 blocks before the current DP started and that the delegator has AJNA to delegate
  const { addressIndex } = await promptAsync(['addressIndex']);
  const printVotingPower = async (address: string) => {
    const votingPower = await dp.getVotingPower(address);
    console.log(`${votingPower} for address ${address} (${getIndexByAddress(address)})`);
  };
  if (addressIndex === '') {
    for (const address of publicKeys) {
      await printVotingPower(address);
    }
  } else {
    const address = getAddressByIndex(Number(addressIndex));
    await printVotingPower(address);
  }
};

const printBalance = async (address: string) => {
  const [ethBalance, ajnaBalance] = await Promise.all([
    provider.getBalance(address),
    getBalance(provider, address),
  ]);
  console.log(
    `address ${address} (${getIndexByAddress(address)}) has ${fromWad(ethBalance)} ETH, ${fromWad(
      ajnaBalance
    )} AJNA`
  );
};

const handleGetBalances = async () => {
  console.log(`Select an address (or press enter to view all):`);
  const { addressIndex } = await promptAsync(['addressIndex']);
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
  console.log(`Select an address from, to and AJNA amount:`);
  const { fromAddressIndex, toAddressIndex, amount } = await promptAsync([
    'fromAddressIndex',
    'toAddressIndex',
    'amount',
  ]);
  const fromWallet = getWalletByIndex(Number(fromAddressIndex));
  const toAdress = getAddressByIndex(Number(toAddressIndex));
  const tx = await transfer(fromWallet, toAdress, toWad(Number(amount)));
  const receipt = await tx.verifyAndSubmit();
  console.log(receipt);
  console.log(`balances after transfer:`);
  await printBalance(fromWallet.address);
  await printBalance(toAdress);
};

const handleMine = async () => {
  console.log(`Current block: ${await provider.getBlockNumber()}`);
  console.log(
    'hints: mine 648.000 blocks to force the active distribution period to become unactive'
  );
  console.log(`Enter the number of blocks:`);
  const { numberOfBlocks } = await promptAsync(['numberOfBlocks']);
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
      await handleStartDistributionPeriod();
      break;
    case '5':
      await handleGetDistributionPeriod();
      break;
    case '6':
      await handleGetVotingPower();
      break;
    case '7':
      await handleGetBalances();
      break;
    case '8':
      await handleTransfer();
      break;
    case '9':
      await handleMine();
      break;
    case '0':
      process.exit(0);
    default:
      console.log('Invalid option, please try again');
  }
};

const main = async () => {
  checkRequiredEnv();
  console.log(mainMenuAsciiArt);
  while (true) {
    console.log(mainMenuOptions);
    const { option } = await promptAsync(['option']);
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
