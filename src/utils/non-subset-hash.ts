import web3 from 'web3';

const nonSubsetHash = () => {
  return web3.utils.keccak256('ERC20_NON_SUBSET_HASH').toString();
};

export default nonSubsetHash;
