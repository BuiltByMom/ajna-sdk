# ajna-finance/sdk-api

A typescript SDK that can be used to create Dapps in Ajna ecosystem."

## Write `.env` file

```shell
AJNA_ETH_RPC_URL=http://localhost:8545/
AJNA_PRIVATE_KEY=<YOUR_PRIV_KEY>
AJNA_COMP=<THE_COMP_COLLATERAL_ADDRESS>
AJNA_DAI=<THE_DAI_QUOTE_TOKEN_ADDRESS>
AJNA_CONTRACT_ERC20_POOL_FACTORY=<THE_ERC20_POOL_FACTORY>
AJNA_CONTRACT_ERC721_POOL_FACTORY=<THE_ERC721_POOL_FACTORY>
```

## Scripts

### `yarn start:dev`

Starts the application in development using `nodemon` and `ts-node` to do hot reloading.

### `yarn start`

Starts the app in production by first building the project with `yarn build`, and then executing the compiled JavaScript at `build/index.js`.

### `yarn build`

Builds the app at `build`, cleaning the folder first.

### `yarn test`

Runs the `jest` tests once.

### `yarn test:dev`

Run the `jest` tests in watch mode, waiting for file changes.
