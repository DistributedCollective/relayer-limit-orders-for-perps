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

Edit the .env file:


Make sure the `MANAGER_ADDRESS`, `TOKEN_ADDRESS` and the `ORDER_BOOK_ADDRESS` point to the AMM that's currently in use, the rBTC ERC20 contract and the address of the running order book contract. The ones in the .env-sample should point to the correct ones.

Configure `TELEGRAM_BOT_SECRET` and `TELEGRAM_CHANNEL_ID` with the correct credentials of a telegram bot ([here's how you can create your own](https://core.telegram.org/bots#3-how-do-i-create-a-bot)) so that the liquidator can send you notifications* if something goes wrong.

The `HEARTBEAT_LISTENER_URL` is a heartbeat listening API endpoint. [TheNurse](https://github.com/DistributedCollective/TheNurse) is a project that's being built for this. If there's a running instance of TheNurse at `https://thenurse.example.com`, then `HEARTBEAT_LISTENER_URL` would be set to `https://thenurse.example.com/api/heartbeats`

## Run it.

The relayer needs access to a mnemonic that represents a bip39 seed phrase, so it can create multiple wallet instances that can relay multiple orders concurrently.

The call to `getConnectedAndFundedSigners( 'LimitOrderBook', ORDER_BOOK_ADDRESS, 0, 3, true);` in the `src/main.ts` file, returns up to 4 wallet** instances, from which the first one is used to listen to the smart contract emitted events and the last (up to) 3 are used to relay orders.

The liquidator reads the mnemonic from the `MNEMONIC` environment variable. Whether you set it in the .env file, or from the CLI in the terminal where you start the script, it doesn't matter.

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
