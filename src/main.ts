const configFileName = process.argv?.[2] || '../.env';
const path = require('path');
let configPath = path.resolve(__dirname, '../', configFileName);
require('dotenv').config({ path: configPath });
import { walletUtils, perpQueries, perpUtils } from '@sovryn/perpetual-swap';

const {
  MANAGER_ADDRESS,
  NODE_URLS,
  ORDER_BOOK_ADDRESS,
  MNEMONIC,
  MAX_BLOCKS_BEFORE_RECONNECT,
  TELEGRAM_BOT_SECRET,
  TELEGRAM_CHANNEL_ID,
} = process.env;

if (!MNEMONIC) {
  console.log(`ERROR: Mnemonic is not present.`);
  process.exit(1);
}

import { checkFundingHealth } from './utilFunctions';
const { getSigningContractInstance } = walletUtils;
import TelegramNotifier from './notifier/TelegramNotifier';
import { v4 as uuidv4 } from 'uuid';
const fetch = require('node-fetch');
const { queryTraderState, queryAMMState, queryPerpParameters } = perpQueries;

let orderbook = Array();

const runId = uuidv4();
console.log(`runId: ${runId}`);
let notifier = getTelegramNotifier(TELEGRAM_BOT_SECRET, TELEGRAM_CHANNEL_ID);

(async function main() {
  try {
    let [[driverLOB, ...signingLOBs], [driverManager, ...signingManagers]] =
      await Promise.all([
        getConnectedAndFundedSigners(
          'LimitOrderBook',
          ORDER_BOOK_ADDRESS,
          0,
          11,
          true
        ),
        getConnectedAndFundedSigners(
          'IPerpetualManager',
          ORDER_BOOK_ADDRESS,
          0,
          11,
          true
        ),
      ]);

    orderbook = await initializeRelayer(signingLOBs);

    if (process.env.HEARTBEAT_SHOULD_RESTART_URL) {
      let intervalId = setInterval(
        () => shouldRestart(runId, 'RELAYER_ORDERBOOK_BLOCK_PROCESSED'),
        5_000
      );
      let intervalId2 = setInterval(
        () => shouldRestart(runId, 'RELAYER_MANAGER_BLOCK_PROCESSED'),
        5_000
      );
    } else {
      console.warn(
        'Env var HEARTBEAT_SHOULD_RESTART_URL is not set, so if the nodes are pausing the connection, can not restart automatically.'
      );
    }

    while (true) {
      try {
        let res = await runForNumBlocks(
          driverLOB,
          signingLOBs,
          MAX_BLOCKS_BEFORE_RECONNECT
        );
        console.log(`Ran for ${MAX_BLOCKS_BEFORE_RECONNECT}`);
      } catch (error) {
        console.log(`Error in while(true):`, error);
        // await notifier.sendMessage(`Error in while(true): ${(error as any).message}`);
      }

      //remove event listeners and reconnect
      driverLOB.provider.removeAllListeners();
      driverLOB.removeAllListeners();

      [[driverLOB, ...signingLOBs], [driverManager, ...signingManagers]] =
        await Promise.all([
          getConnectedAndFundedSigners(
            'LimitOrderBook',
            ORDER_BOOK_ADDRESS,
            0,
            11,
            true
          ),
          getConnectedAndFundedSigners(
            'IPerpetualManager',
            ORDER_BOOK_ADDRESS,
            0,
            11,
            true
          ),
        ]);
    }
  } catch (error) {
    console.log(
      `General error while liquidating users, exiting process`,
      error
    );
    await notifier.sendMessage(
      `General error while liquidating users: ${
        (error as any).message
      }. Exiting.`
    );
    process.exit(1);
  }
})();

/**
 * Run the realyer script for a period of maxBlocks
 * @param signingManager a signing manager contract instance
 * @param maxBlocks the number of blocks after the current readManager gets re-connected
 * @returns
 */
function runForNumBlocks<T>(
  driverManager,
  signingManagers,
  maxBlocks
): Promise<void> {
  return new Promise((resolve, reject) => {});
}

async function initializeRelayer(signingLOBs) {
  let driverLOB = signingLOBs[0];
  let lastDigest = '0x0';
  let batchSize = 100;
  let result = Array();
  /**
   * TODO
   * using the first digest (0x000...), get the orders by calling pollLimitOrders(), until we get orderCount num of orders
   */
  let ordersBatch = Array();
  let digestsBatch = Array();
  do {
    [ordersBatch, digestsBatch] = await driverLOB.pollLimitOrders(
      lastDigest,
      batchSize
    );
    lastDigest = digestsBatch[digestsBatch.length - 1];
    result = result.concat(ordersBatch);
  } while (ordersBatch.length === batchSize);
  let numOrders = await driverLOB.orderCount();
  numOrders = parseInt(numOrders);
  if (numOrders !== result.length) {
    const msg = `The orderCount (${numOrders}) is different than the actual orders returned (${ordersBatch.length})`;
    console.error(msg);
    throw new Error(msg);
  }
  return orderbook;
}

async function shouldRestart(runId, heartbeatCode) {
  try {
    let heartbeatUrl = process.env.HEARTBEAT_SHOULD_RESTART_URL;
    if (!heartbeatUrl) {
      console.warn(
        'Env var HEARTBEAT_SHOULD_RESTART_URL is not set, so if the nodes are pausing the connection, can not restart automatically.'
      );
      return;
    }

    let url = heartbeatUrl + `/${runId}/${heartbeatCode}`;
    let res = await fetch(url, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
    });
    if (res.statusText.toLowerCase() !== 'ok') {
      let responseText = await res.text();
      let msg = `Error when shouldRestart: ${res.statusText}; response text: ${responseText}`;
      console.warn(msg);
      await notifier.sendMessage(msg);
      return;
    }

    let restartRes = await res.json();
    if (restartRes?.shouldRestart) {
      console.warn(
        `Restarting ${runId}, code ${heartbeatCode}. Time since last heartbeat: ${res?.timeSinceLastHeartbeat} (${url})`
      );
      process.exit(1);
    }
  } catch (error) {
    console.warn(`Error when shouldRestart:`, error);
  }
}

async function getConnectedAndFundedSigners(
  abiName,
  ctrAddr,
  fromWallet,
  numSigners,
  includeDriverManager = true
) {
  let bscNodeURLs = JSON.parse(NODE_URLS || '[]');
  let signers = Array();
  let areRelayersFunded = Array();
  let numRetries = 0;
  let maxRetries = 10;
  let included = false;
  let fundedSigners = Array();
  let fundedWalletAddresses = Array();
  let timeStart = new Date().getTime();
  while (true) {
    try {
      //get an array of signingWallets
      signers =
        getSigningContractInstance(
          ctrAddr,
          MNEMONIC,
          bscNodeURLs,
          abiName,
          fromWallet,
          numSigners
        ) || [];

      //get the number of Relayings each can make [{[relayerAddress]: numRelayings}]
      //this also checks whether the signingManagers are connected and the node responds properly
      let gasAmount = abiName === 'IPerpetualManager' ? 1_000_000 : 4_000_000;
      areRelayersFunded = await checkFundingHealth(signers, gasAmount);
      areRelayersFunded = areRelayersFunded.sort((a, b) => {
        let [relayerAddrA, numRelayingsA] = Object.entries(a)[0];
        let [relayerAddrB, numRelayingsB] = Object.entries(b)[0];
        return parseInt(numRelayingsB as any) - parseInt(numRelayingsA as any);
      });
      for (let i = 0; i < areRelayersFunded.length; i++) {
        let relayer = areRelayersFunded[i];
        let [relayerAddr, numRelayings] = Object.entries(relayer)[0];
        if (typeof numRelayings !== 'number') {
          console.log(
            `Unable to instantiate signer with address ${relayerAddr}, i=${i}, ${(
              numRelayings as any
            ).toString()}`
          );
          continue;
        }
        if (numRelayings > 0) {
          fundedSigners.push(signers[i]);
          fundedWalletAddresses.push(relayer);
          continue;
        }
        if (includeDriverManager && !included) {
          fundedSigners.unshift(signers[i]);
          fundedWalletAddresses.unshift(relayer);
          included = true;
        }
      }
      if (
        fundedSigners.length === 0 ||
        (includeDriverManager && fundedSigners.length === 1)
      ) {
        let msg = `[${new Date()}] WARN: there are no funded relaying wallets. Can not route orders because there are no enough tx fee funds in the selected wallets. Retrying! ${JSON.stringify(
          areRelayersFunded,
          null,
          2
        )}`;
        console.warn(msg);
        throw new Error(msg);
      }
      break;
    } catch (error) {
      console.log(error);
      numRetries++;
      if (numRetries >= maxRetries) {
        let msg = `[${new Date()}] FATAL: could not connect to a node after ${maxRetries} attempts. Exiting!`;
        console.error(msg);
        await notifier.sendMessage(msg);
        process.exit(1);
      }
    }
  }

  let timeEnd = new Date().getTime();
  console.log(
    `(${
      timeEnd - timeStart
    } ms) Funded wallets after ${numRetries} connection attempts:`,
    fundedWalletAddresses
  );
  return fundedSigners;
}
function getTelegramNotifier(telegramSecret, telegramChannel) {
  if (!telegramSecret || !telegramChannel) {
    console.error(
      `Can not instantiate the telegramNotifier because either telegramSecret ("${telegramSecret}"), or telegramChannelId ("telegramChannel") is missing. Exiting.`
    );
    process.exit(1);
  }
  return new TelegramNotifier(telegramSecret, telegramChannel);
}
