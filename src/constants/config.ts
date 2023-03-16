import dotenv from 'dotenv';

dotenv.config();

export const CONTRACT_ERC20_POOL_FACTORY = process.env.AJNA_CONTRACT_ERC20_POOL_FACTORY || '';

export const CONTRACT_ERC721_POOL_FACTORY = process.env.AJNA_CONTRACT_ERC721_POOL_FACTORY || '';

export const POOL_UTILS = process.env.AJNA_POOL_UTILS || '';

export const TEST_CONFIG = {
  ETH_RPC_URL: process.env.ETH_RPC_URL || '',
  COLLATERAL_ADDRESS: process.env.AJNA_COLLATERAL_ADDRESS || '',
  QUOTE_ADDRESS: process.env.AJNA_QUOTE_ADDRESS || '',
  DEPLOYER: process.env.AJNA_DEPLOYER_ADDRESS || '',
  DEPLOYER_KEY: process.env.AJNA_DEPLOYER_PRIVATE_KEY || '',
  LENDER: process.env.AJNA_LENDER_ADDRESS || '',
  LENDER_KEY: process.env.AJNA_LENDER_PRIVATE_KEY || '',
  BORROWER: process.env.AJNA_BORROWER_ADDRESS || '',
  BORROWER_KEY: process.env.AJNA_BORROWER_PRIVATE_KEY || '',
};
