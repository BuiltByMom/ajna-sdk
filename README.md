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

### `npm run start:dev`

Starts the application in development using `nodemon` and `ts-node` to do hot reloading.

### `npm run start`

Starts the app in production by first building the project with `npm run build`, and then executing the compiled JavaScript at `build/index.js`.

### `npm run build`

Builds the app at `build`, cleaning the folder first.

### `npm run test`

Runs the `jest` tests once.

### `npm run test:dev`

Run the `jest` tests in watch mode, waiting for file changes.
