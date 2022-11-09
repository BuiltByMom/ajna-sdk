/* eslint-disable @typescript-eslint/no-explicit-any, no-console */
import Web3 from 'web3';
import { Contract } from 'web3-eth-contract';
import { getPoolFactoryContract } from './contracts/get-pool-factory-contract';
import dotenv from 'dotenv';

dotenv.config();

const config = {
  ETH_RPC_URL: process.env.AJNA_ETH_RPC_URL,
  PRIVATE_KEY: process.env.AJNA_PRIVATE_KEY,
  COMP: process.env.AJNA_COMP,
  DAI: process.env.AJNA_DAI
};

describe('test stuff', () => {
  let contractInstance: Contract;
  // let accounts: string[];
  let web3: any;
  let signer: any;

  beforeAll(async () => {
    try {
      web3 = new Web3(config['ETH_RPC_URL'] || '');

      // Creating a signing account from a private key
      signer = web3.eth.accounts.privateKeyToAccount(config['PRIVATE_KEY']);

      web3.eth.accounts.wallet.add(signer);

      // accounts = await web3.eth.getAccounts();
      // console.log(accounts);

      // Create initial contract instance
      contractInstance = getPoolFactoryContract(web3);
    } catch (err) {
      console.log(err);

      // handle error
      throw err;
    }
  });

  it('should deploy the a new pool', async () => {
    const interestRate = web3.utils.toWei('0.05', 'ether');
    const nonSubsetHashParam = web3.utils
      .keccak256('ERC20_NON_SUBSET_HASH')
      .toString();

    const tx = contractInstance.methods.deployPool(
      config['COMP'],
      config['DAI'],
      interestRate
    );

    const receipt = await tx
      .send({
        from: signer.address,
        gas: await tx.estimateGas()
      })
      .once('transactionHash', () => {
        console.log(`Mining transaction ...`);
      });

    // The transaction is now on chain!
    console.debug(receipt);

    const poolAddress = await contractInstance.methods
      .deployedPools(nonSubsetHashParam, config['COMP'], config['DAI'])
      .call();

    console.info('poolAddress', poolAddress);

    expect(poolAddress).not.toBe('');
  });
});
