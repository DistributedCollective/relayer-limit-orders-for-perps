# Sovryn perpetuals swap limit orders relayer
Limit orders relaying scripts for Sovryn Perpetual Swaps
 
## Install it
```
$ git clone https://github.com/DistributedCollective/relayer-limit-orders-for-perps
$ cd relayer-limit-orders-for-perps
$ mv .env-sample .env
$ npm install
$ npm install -g ts-node
``` 

## Configure it

Edit the ecosystem.config.js file:

Make sure that `OWNER_ADDRESS` is **one of your wallet addresses**, because that's where the commissions earned by liquidating traders will end into!

Make sure the `MANAGER_ADDRESS` and the `TOKEN_ADDRESS` point to the AMM that's currently in use, the rBTC ERC20 contract and the address of the running order book contract. The ones in the .env-sample should point to the correct ones.

For now there are 2 perpetuals running: BTC/USD and BNB/USD. In order to have one relayer instance working for each of these, we have it configured as an app in the `ecosystem.config.js` file. There are a few other env variable which needs to be configured in the above file:
- `ORDER_BOOK_ADDRESS` - the address where the orderbook for that perp is deployed
- `IDX_START_ADDR` - the index of the start wallet generated using the `MNEMONIC` (ie: for `IDX_START_ADDR=3`, the derivation path of the starting wallet is `m/44'/60'/0'/0/3`)
- `NUM_ADDRESSES` is the number of wallets that'll be used to relay orders concurrently. (ie: if `IDX_START_ADDR=3` and `NUM_ADDRESSES=3`, then the derivation path of the last wallet used will be `m/44'/60'/0'/0/5`)
- `PERP_NAME` - this is used when sending heartbeats and in logs to differentiate between perpetuals and testnet/mainnet
- `NODE_URLS` - a list of nodes where the orders relayer will connect to (it will choose a random one from this list)
- `PUBLIC_NODE_PROVIDER` - a single node which we query to get the latest block mined. This number is compared with the latest block mined by the node the orders relayer is connected to.
- `DB_NAME` - the filename of the sqlite db used for storing/retrieving info cached for the dashboard.
- `BLOCK_EXPLORER` - the URL of the block explorer, used when displaying transactions/wallet URLs
- `SERVER_PORT` - the port where the dashboard for the current perpetual can be accessed
- `BALANCE_THRESHOLD` - the BNB amount below which orders relayer wallet account is shown in red in the dashboard

The `HEARTBEAT_LISTENER_URL` is a heartbeat listening API endpoint. [TheNurse](https://github.com/DistributedCollective/TheNurse) is a project that's being built for this. If there's a running instance of TheNurse at `https://thenurse.example.com`, then `HEARTBEAT_LISTENER_URL` would be set to `https://thenurse.example.com/api/heartbeats`

Create and edit the `.env` file (`mv .env-example .env`):
Configure `TELEGRAM_BOT_SECRET` and `TELEGRAM_CHANNEL_ID` with the correct credentials of a telegram bot ([here's how you can create your own](https://core.telegram.org/bots#3-how-do-i-create-a-bot)) so that the orders relayer can send you notifications* if something goes wrong.

## Run it.

The relayer needs access to a mnemonic that represents a bip39 seed phrase, so it can create multiple wallet instances that can relay multiple orders concurrently.

The call to `getConnectedAndFundedSigners( 'LimitOrderBook', ORDER_BOOK_ADDRESS, 0, 3, true);` in the `src/main.ts` file, returns up to 4 wallet** instances, from which the first one is used to listen to the smart contract emitted events and the last (up to) 3 are used to relay orders.

The orders relayer reads the mnemonic from the `MNEMONIC` environment variable. Whether you set it in the .env file, or from the CLI in the terminal where you start the script, it doesn't matter.

Once the `MNEMONIC` env variable is configured, run:
```
$ ts-node src/main.ts
```

Or, to start it with pm2:

```
$ pm2 start ecosystem.config.js
```


# Notes:

\* The script won't start without the telegram credentials configured. If you want to start it started without configuring the telegram bot, comment out all the references to the `notifier` variable in the `src/main.ts` and the `src/utilFunctions.ts` files.
  
** up to 3, meaning the function will filter out the wallets that are not funded with the equivalent of 4 million gas in testnet BSC, to make sure all of them are able to liquidate at least once.
