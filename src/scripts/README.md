# Scripts

## Configuration

First, install `ts-node` globally:

npm

    npm i -g ts-node

yarn

    yarn global add ts-node

### Check wallet

    ts-node ./src/scripts/check-wallet.ts <path/to/json/keystore>

### Create new wallet

    ts-node ./src/scripts/create-new-wallet.ts [plaintext-password] <path/to/json/keystore>
