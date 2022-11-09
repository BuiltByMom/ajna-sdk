import dotenv from 'dotenv';

dotenv.config();

export const INFURA_KEY = process.env.INFURA_KEY;

export const CONTRACT_ERC20_POOL_FACTORY =
  process.env.AJNA_CONTRACT_ERC20_POOL_FACTORY;

export const CONTRACT_ERC721_POOL_FACTORY =
  process.env.AJNA_CONTRACT_ERC721_POOL_FACTORY;
