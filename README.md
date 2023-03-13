# ajna-finance/sdk-api

A typescript SDK that can be used to create Dapps and keepers in Ajna ecosystem.

## Setup

- Install/select Node.js 14/16/18 using your preferred package/version manager. Note that CI runs against Node 14, but the linter requires ^16.14 or ^18.
- `yarn install` installs dependencies.
- `yarn build` builds the app at `build`, cleaning the folder first.

## Design

### Exception handling

To improve responsiveness, the SDK may raise an `SdkException` locally if it knows the transaction will not succeed with the current state. The SDK does not attempt to handle or wrap contract reverts or connectivity errors. As such, the consumer should assume all onchain calls could throw an exception.

// TODO: Make a list of generally expected exception classes (ours and Ethers.js).

## Notices

Due to [an issue in Ethers.js v5](https://github.com/ethers-io/ethers.js/issues/1029), warnings like the following will be printed when using this library in a console application:

```
duplicate definition - AuctionNotCleared()
duplicate definition - RemoveDepositLockedByAuctionDebt()
duplicate definition - TransactionExpired()
```

## Usage

### Prerequisites

Instructions assume basic knowledge of TypeScript, [Ethers.js](https://docs.ethers.org/v5), and interacting with blockchains which use the Ethereum Virtual Machine (EVM).

### Working with numeric types

Quantities and prices in Ajna are represented in WAD (18-decimal) precision. Ethers.js v5 models this using `BigNumber`. To convert to and from these scaled values, `toWad` and `fromWad` are provided. Do not explicitly multiply or divide by 10^18.

`toWad` allows conversions from both `number` and `string` values.
`fromWad` converts to `string` values, such that precision is not lost.

Price buckets in Ajna are identified by an integer bucket index, between 1 (highest price) and 7388 (lowest price). To convert to and from bucket indicies, `priceToIndex` and `indexToPrice` functions are provided. The SDK uses `number` type to model bucket indices.

### Examples

Example scripts are provided in the `examples/` directory. To run one, first review the script and set relevant environment variables. Then run `npx ts-node examples/<script_name>.ts`.

## Unit testing

Copy `.env.example` to `.env` to run tests against a dockerized Ajna testnet.
**Addresses and keys in the example file are publicly known. Do not attempt to use these addresses on a public network!**

`yarn test` runs `jest` tests once.
`yarn test:dev` runs the `jest` tests in watch mode, waiting for file changes.

To pass parameters to `jest`, run using `npx`. For example, to run a single test and print console output:

```shell
npx jest --silent=false -t 'should confirm AjnaSDK pool succesfully'
```

## Maintenance

This package offers a facility to translate ABIs as compiled to a format consumable by Ethers.js. To use:

- Set `AJNA_ABIS` environment var to the location where your compiler has generated the JSON ABI files. This assumes all ABIs reside in a single directory.
- Run `yarn update-abis` to overwrite current ABIs in `src/abis`.

This facility was tested against `brownie` compilation output.
