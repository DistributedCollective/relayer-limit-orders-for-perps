const configFileName = process.argv?.[2] || '.env';
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

import {
    checkFundingHealth,
    addOrderToOrderbook,
    sortOrderbook,
    orderToOrderTS,
    sendHeartBeat,
    getMatchingOrders,
    executeOrders,
    unlockOrder,
    Order,
} from './utilFunctions';
const { getSigningContractInstance } = walletUtils;
import TelegramNotifier from './notifier/TelegramNotifier';
import { v4 as uuidv4 } from 'uuid';
import { getMarkPrice } from '@sovryn/perpetual-swap/dist/scripts/utils/perpUtils';
const fetch = require('node-fetch');
const { queryTraderState, queryAMMState, queryPerpParameters } = perpQueries;

let orderbook = Array();
let originalOrders = Object();
let perpIds = Array();

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
                    MANAGER_ADDRESS,
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
                await Promise.race([
                    runForNumBlocksLimitOrder(
                        driverLOB,
                        signingLOBs,
                        MAX_BLOCKS_BEFORE_RECONNECT
                    ),
                    runForNumBlocksManager(
                        driverManager,
                        signingLOBs,
                        MAX_BLOCKS_BEFORE_RECONNECT
                    ),
                ]);
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
            `[RELAYER] General error while relaying orders, exiting process`,
            error
        );
        await notifier.sendMessage(
            `[RELAYER] General error while liquidating users: ${(error as any).message
            }. Exiting.`
        );
        process.exit(1);
    }
})();

let blockProcessingErrors = 0;

/**
 * Listen to the events generated by the manager instance for a period of maxBlocks
 * @param signingManager a signing manager contract instance
 * @param maxBlocks the number of blocks after the current readManager gets re-connected
 * @returns
 */
function runForNumBlocksManager<T>(
    driverManager,
    signingLoBs,
    maxBlocks
): Promise<void> {
    return new Promise((resolve, reject) => {
        driverManager.once('error', (e) => {
            console.log(`driverManager.once('error') triggered`, e);
            reject(e);
        });

        /**
         * TODO:
         * - get price,
         * - search for matching orders,
         * - call executeLimitOrder
         */

        let numBlocks = 0;
        driverManager.provider.on('block', async (blockNumber) => {
            try {
                let timeStart = new Date().getTime();

                for (const perpId of perpIds) {
                    let ammData = await queryAMMState(driverManager, perpId);
                    let markPrice = getMarkPrice(ammData);
                    let tradeableOrders = getMatchingOrders(orderbook, markPrice);
                    if (tradeableOrders.length) {
                        let res = await executeOrders(signingLoBs, tradeableOrders, orderbook, originalOrders);
                        if(Object.keys(res).length){
                            console.log(`----------relayed orders`, res);
                        }
                    }
                }
                let timeEnd = new Date().getTime();
                if (numBlocks % 50 === 0) {
                    console.log(`[${new Date()} (${timeEnd - timeStart} ms) block: ${blockNumber}] numBlocks ${numBlocks} active orders ${orderbook.length}`);
                }
                await sendHeartBeat("LIQ_BLOCK_PROCESSED", {
                    blockNumber,
                    runId,
                    duration: timeEnd - timeStart,
                }, notifier);
                blockProcessingErrors = 0;
                numBlocks++;
                if (numBlocks >= maxBlocks) {
                    return resolve();
                }
            } catch (error) {
                console.log(`Error in block processing callback:`, error);
                blockProcessingErrors++;
                if (blockProcessingErrors >= 5) {
                    await notifier.sendMessage(`Error in block processing callback ${(error as Error).message}`);
                }
                return reject(error);
            }
        });
    });
}

/**
 * Listen to the events generated by the LimitOrder contract instance for a period of maxBlocks
 * @param signingManager a signing manager contract instance
 * @param maxBlocks the number of blocks after the current readManager gets re-connected
 * @returns
 */
function runForNumBlocksLimitOrder<T>(
    driverLOB,
    signingLOBs,
    maxBlocks
): Promise<void> {
    return new Promise((resolve, reject) => {
        driverLOB.once('error', (e) => {
            console.log(`driverLOB.once('error') triggered`, e);
            reject(e);
        });

        driverLOB.on(
            'PerpetualLimitOrderCreated',
            async (perpId, traderAddress, limitPrice, triggerPrice, digest) => {
                let order = await driverLOB.orderOfDigest(digest);
                orderbook = addOrderToOrderbook(order as Order, orderbook, digest, originalOrders);
                console.log(`Got new order: `, order, orderbook)
            }
        );
    });
}

async function initializeRelayer(signingLOBs) {
    let driverLOB = signingLOBs[0];
    //the 0x0 value for the firstDigest actually. We start from it and ask for orders in batches of batchSize
    let lastDigest = '0x0000000000000000000000000000000000000000000000000000000000000000';
    let batchSize = 100;
    let result = Array();
    let ordersBatch = Array();
    let digestsBatch = Array();
    do {
        [ordersBatch, digestsBatch] = await driverLOB.pollLimitOrders(
            lastDigest,
            batchSize
        );
        let lastBatchElemIdx = digestsBatch.length - 1;
        //the pollLimitOrders method returns the batches filled with zero-values if there are not enough orders to fill the batch, so we get rid of the empty ones
        while (parseInt(digestsBatch[lastBatchElemIdx]) === 0) {
            //remove the last element of the batch. Array.pop() or Array.slice() didn't work
            digestsBatch = digestsBatch.slice(0, lastBatchElemIdx);
            ordersBatch = ordersBatch.slice(0, lastBatchElemIdx);
            lastBatchElemIdx = digestsBatch.length - 1;
        }

        lastDigest = digestsBatch[digestsBatch.length - 1];
        let idx = 0;
        for (const o of ordersBatch) {
            result.push(orderToOrderTS(o, digestsBatch[idx]));
            if (o.iDeadline > Math.floor(new Date().getTime() / 1000)) {
                originalOrders[digestsBatch[idx]] = o;
            }
            idx++;
        }
    } while (ordersBatch.length === batchSize);
    let numOrders = await driverLOB.orderCount();

    numOrders = parseInt(numOrders.toNumber());
    if (numOrders !== result.length) {
        const msg = `The orderCount (${numOrders}) is different than the actual orders returned (${result.length})`;
        console.error(msg);
        throw new Error(msg);
    }
    result = result.filter(o => o.iDeadline > Math.floor(new Date().getTime() / 1000));
    orderbook = sortOrderbook(result);
    for (const order of orderbook) {
        if (!perpIds.includes(order.iPerpetualId)) {
            perpIds.push(order.iPerpetualId);
        }
        unlockOrder(order.digest, true);
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
        `(${timeEnd - timeStart
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
