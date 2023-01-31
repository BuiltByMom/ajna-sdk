# ajna-finance/sdk-api

A typescript SDK that can be used to create Dapps and keepers in Ajna ecosystem.

## Setup

- Install/select Node.js 14/16/18 using your preferred package/version manager. Note that CI runs against Node 14, but the linter requires ^16.14 or ^18.
- `yarn install` installs dependencies.
- `yarn build` builds the app at `build`, cleaning the folder first.

## Unit testing

Copy `.env.example` to `.env` to run tests against a dockerized Ajna testnet.
**Addresses and keys in the example file are publicly known. Do not attempt to use these addresses on a public network!**

`yarn test` runs `jest` tests once.
`yarn test:dev` runs the `jest` tests in watch mode, waiting for file changes.

To pass parameters to `jest`, run using `npx`. For example, to run a single test and print console output:

```
npx jest -t 'should confirm AjnaSDK pool succesfully' --silent=false
```
