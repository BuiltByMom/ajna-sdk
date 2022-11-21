import web3 from 'web3';

const toWei = (value: number | string) => {
  return web3.utils.toWei(String(value), 'ether');
};

export default toWei;
