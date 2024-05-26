# Creating new pool with Open Book MarketID and remove LP according to the configuration

## Features

- Create new pool with Open Book MarketID
- Remove LP according to the configuration

## Prerequisites

Before you begin, ensure you have met the following requirements:

- Node.js installed (v18 or above recommended)
- Yarn
- A Solana wallet with some SOL for testing the swap

## Configurations

Create a new `.env` file and add your Private key, Rpc URL

`.env` file
```

WALLET_PRIVATE_KEY='AaTc...'
RPC_URL='https://mainnet.helius-rpc.com/?api-key=862a...'

```

Then run

```sh
yarn clean

yarn build

yarn start
```
## Version 1.0,   26/5/2024