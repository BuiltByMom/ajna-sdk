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
LENDER_PASSWORD=<key password>
BORROWER_ADDRESS=0x123...
BORROWER_KEYSTORE=/path/to/borrower-keystore.json
BORROWER_PASSWORD=<key password>
VOTER_ADDRESS=0xAbc...
VOTER_KEYSTORE=/path/to/voter-keystore.json
VOTER_PASSWORD=<key password>

COLLATERAL_TOKEN=0x9c09FE6b19174D838CAe2C4Fb5A4A311c4008441
QUOTE_TOKEN=0x10aA0Cf12AAb305bd77AD8F76c037E048B12513B
AJNA_TOKEN_ADDRESS=0xaadebCF61AA7Da0573b524DE57c67aDa797D46c5
```

CAUTION: storing key passwords in your environment is insecure and a bad practice. Do not do this with accounts with real funds.

## Using scripts to integration test

Ensure your accounts are funded with tokens. Scripts run fine-grained approvals as needed.

### Repayment

- `./lend.ts add 100 2020.2` - add 100 tokens liquidity at price bucket nearest 2020.2 (index 2630)
- `./lend.ts add 200 2007.0213` - add liquidity at lower price (index 2631)
- `./borrow.ts draw 150 1.3` - draw debt collateralizing at 130%, utilizing about half the pool
- `./borrow.ts repay` - repay debt and pull collateral

### Kickable loan

- `./lend.ts add 300 2002.5` - add initial liquidity
- `./borrow.ts draw 250 1.01` - take out a barely-collateralized loan
- `./lend.ts add 200 1886.9` - add liquidity at lower price
- _Switch to a different borrower address and key_
- `./borrow.ts draw 100 1.45` - second borrower takes out a well-collateralized loan, but pushes down LUP

Now that the LUP has moved to 1886.9, the first borrower is undercollateralized and may be kicked.

### Liquidation

- `./lend.ts add 500 2002.07` - add liquidity, assuming no other lenders
- `./lend.ts add 500 1992.3` - add liquidity at lower price
- `./borrow.ts draw 750 1.25` - draw debt utilizing both buckets
- `./liquidate.ts kickWithDeposit 1992.3` - remove lower-priced deposit, kicking the loan
- `./liquidate.ts status $BORROWER_ADDRESS` - check auction; wait until price reasonable
- `./liquidate.ts take $BORROWER_ADDRESS 0.25` - perform a partial take
- `./liquidate.ts take $BORROWER_ADDRESS` - take remainder of collateral
- `./liquidate.ts settle $BORROWER_ADDRESS` - settle auction and reclaim liquidation bond
