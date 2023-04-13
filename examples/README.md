# Example scripts

These scripts help illustrate how to use the SDK.
To run one, first review the script and set relevant environment variables. Then run `npx ts-node examples/<script_name>.ts`.

## Configuration

First, install `ts-node` globally:
```
sudo npm install -g ts-node
```

Either source an environment script or create an `.env` file in the examples directory.
Here's an example `.env` file to test on Goerli:
```
ETH_RPC_URL=https://eth-goerli.g.alchemy.com/v2/<your key here>

AJNA_CONTRACT_ERC20_POOL_FACTORY=0x9684b8eC942985b23d343cB82D2F30EdA8fD7179
AJNA_POOL_UTILS=0xEa36b2a4703182d07df9DdEe46BF97f9979F0cCf

LENDER_ADDRESS=0xAbc...
LENDER_KEYSTORE=/path/to/lender-keystore.json
BORROWER_ADDRESS=0x123...
BORROWER_KEYSTORE=/path/to/borrower-keystore.json

COLLATERAL_TOKEN=0x9c09FE6b19174D838CAe2C4Fb5A4A311c4008441
QUOTE_TOKEN=0x10aA0Cf12AAb305bd77AD8F76c037E048B12513B
```

## Using them to integration test

Here's a scenario:
- `./lend.ts add 100 2020.2` - add 100 tokens liquidity at price bucket nearest 2020.2 (index 2630)
- `./lend.ts add 200 2007.0213` - add liquidity at lower price (index 2630)
- `./borrow.ts 150 1.3` - draw debt collateralizing at 130%, utilizing about half the pool

