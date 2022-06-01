const configFileName = process.argv?.[2] || '.env';
const path = require('path');
let configPath = path.resolve(__dirname, '../', configFileName);
require('dotenv').config({ path: configPath });
import { perpQueries } from '@sovryn/perpetual-swap';
import * as walletUtils from '@sovryn/perpetual-swap/dist/scripts/utils/walletUtils';

const {
    MANAGER_ADDRESS,
    NODE_URLS,
    ORDER_BOOK_ADDRESS,
    MNEMONIC,
    MAX_BLOCKS_BEFORE_RECONNECT,
    TELEGRAM_BOT_SECRET,
    TELEGRAM_CHANNEL_ID,
    IDX_ADDR_START,
    NUM_ADDRESSES,
    PERP_ID,
    PERP_NAME,
    OWNER_ADDRESS,
} = process.env;
let bscNodeURLs = JSON.parse(NODE_URLS || '[]');

console.log(
    `Perp name ${PERP_NAME}, Manager address ${MANAGER_ADDRESS}, OrderBook address ${ORDER_BOOK_ADDRESS}`
);

let maxBlocksBeforeReconnect = parseInt(MAX_BLOCKS_BEFORE_RECONNECT || '180');

let maxGeneralFailures = 10;

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
    removeOrderFromOrderbook,
    removeOrderFromOrderbookByDigest,
    getPerpetualIds,
    incrementFailures,
    getNumFailures,
    resetFailures,
    isOrderFailed,
} from './utilFunctions';
const { getSigningContractInstance, getReadOnlyContractInstance } = walletUtils;
import TelegramNotifier from './notifier/TelegramNotifier';
import { v4 as uuidv4 } from 'uuid';
import { getMarkPrice } from '@sovryn/perpetual-swap/dist/scripts/utils/perpUtils';
const fetch = require('node-fetch');
const { queryTraderState, queryAMMState, queryPerpParameters } = perpQueries;

let orderbook = Array();

const runId = uuidv4();
console.log(`runId: ${runId}`);
let notifier = getTelegramNotifier(TELEGRAM_BOT_SECRET, TELEGRAM_CHANNEL_ID);

(async function main() {
    let driverLOB, signingLOBs, driverManager;
    try {
        [driverLOB, ...signingLOBs] = await getConnectedAndFundedSigners(
            'LimitOrderBook',
            ORDER_BOOK_ADDRESS,
            parseInt(IDX_ADDR_START),
            parseInt(NUM_ADDRESSES),
            true
        );
        driverManager = getReadOnlyContractInstance(
            MANAGER_ADDRESS,
            bscNodeURLs,
            'IPerpetualManager'
        );

        console.log(
            `LimitOrder connected to node ${driverLOB.provider.connection.url}\nManager connected to ${driverManager.provider.connection.url}`
        );

        orderbook = await initializeRelayer(signingLOBs, driverManager);

        if (process.env.HEARTBEAT_SHOULD_RESTART_URL) {
            //only check if dead after 1 minute after the script started, so it has enough time to send some heartbeats
            setTimeout(() => {
                console.log(`Starting to check if shouldRestart....`);
                setInterval(
                    () =>
                        shouldRestart(
                            runId,
                            `RELAYER_${PERP_NAME || 'unknown'}_BLOCK_PROCESSED`
                        ),
                    5_000
                );
            }, 60_000);
        } else {
            console.warn(
                'Env var HEARTBEAT_SHOULD_RESTART_URL is not set, so if the nodes are pausing the connection, can not restart automatically.'
            );
        }

        while (true) {
            try {
                await Promise.race([
                    listenForLimitOrderEvents(driverLOB),
                    runForNumBlocksManager(
                        driverManager,
                        signingLOBs,
                        maxBlocksBeforeReconnect
                    ),
                ]);
                console.log(`Ran for ${maxBlocksBeforeReconnect}`);
            } catch (error) {
                console.log(`Error in while(true):`, error);
                // await notifier.sendMessage(`Error in while(true): ${(error as any).message}`);
            }

            //remove event listeners and reconnect
            driverLOB.provider.removeAllListeners();
            driverLOB.removeAllListeners();

            [driverLOB, ...signingLOBs] = await getConnectedAndFundedSigners(
                'LimitOrderBook',
                ORDER_BOOK_ADDRESS,
                parseInt(IDX_ADDR_START),
                parseInt(NUM_ADDRESSES),
                true
            );
            driverManager = getReadOnlyContractInstance(
                MANAGER_ADDRESS,
                bscNodeURLs,
                'IPerpetualManager'
            );
            console.log(
                `LimitOrder connected to node ${driverLOB.provider.connection.url}\nManager connected to ${driverManager.provider.connection.url}`
            );
            orderbook = await initializeRelayer([driverLOB], driverManager);
            resetFailures('GENERAL_ERROR');
        }
    } catch (error) {
        incrementFailures('GENERAL_ERROR');
        const numFailures = getNumFailures('GENERAL_ERROR');
        console.log(
            `[RELAYER] General error while relaying orders, exiting process. numFailures: ${numFailures}`,
            error
        );
        if (numFailures >= maxGeneralFailures) {
            await notifier.sendMessage(
                `[RELAYER] General error while relaying orders: ${
                    (error as any).message
                }. Exiting. numFailures: ${numFailures}`
            );
        }
        driverLOB?.provider?.removeAllListeners();
        driverLOB?.removeAllListeners();
        process.exit(0);
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
        try {
            driverManager.once('error', (e) => {
                console.log(`driverManager.once('error') triggered`, e);
                reject(e);
            });

            let numBlocks = 0;
            let blockProcessing = 0;
            driverManager.provider.on('block', async (blockNumber) => {
                try {
                    if (blockProcessing) {
                        if (blockNumber - blockProcessing > 5) {
                            console.log(
                                `RELAYER_${
                                    PERP_NAME || 'undefined'
                                } Skip processing block ${blockNumber} because block ${blockProcessing} is still being processed`
                            );
                        }
                        if (blockNumber - blockProcessing > 100) {
                            let msg = `RELAYER_${
                                PERP_NAME || 'undefined'
                            } Block processing is falling behind. Block being processed is ${blockProcessing}, while current blockNumber is ${blockNumber}`;
                            console.warn(msg);
                            await notifier.sendMessage(msg);
                            process.exit(1);
                        }
                        return;
                    }
                    blockProcessing = blockNumber;
                    let timeStart = new Date().getTime();

                    let [ammData, perpParams] = await Promise.all([
                        queryAMMState(driverManager, PERP_ID as any),
                        queryPerpParameters(driverManager, PERP_ID as any),
                    ]);

                    let tradeableOrders = getMatchingOrders(
                        orderbook,
                        perpParams,
                        ammData
                    );
                    if (tradeableOrders.length) {
                        blockProcessing = 0;
                        let res = await executeOrders(
                            signingLoBs,
                            OWNER_ADDRESS,
                            tradeableOrders,
                            orderbook
                        );
                        if (Object.keys(res).length) {
                            console.log(`relayed orders`, res);
                        }
                    }
                    let timeEnd = new Date().getTime();
                    if (numBlocks % 50 === 0) {
                        console.log(
                            `[${new Date()} (${
                                timeEnd - timeStart
                            } ms) block: ${blockNumber}] numBlocks ${numBlocks} active orders ${
                                orderbook.length
                            }`
                        );
                    }
                    await sendHeartBeat(
                        `RELAYER_${PERP_NAME || 'unknown'}_BLOCK_PROCESSED`,
                        {
                            blockNumber,
                            runId,
                            duration: timeEnd - timeStart,
                        },
                        notifier
                    );
                    blockProcessingErrors = 0;
                    blockProcessing = 0;
                    numBlocks++;
                    if (numBlocks >= maxBlocks) {
                        numBlocks = 0;
                        return resolve();
                    }
                } catch (error) {
                    blockProcessing = 0;
                    console.log(`Error in block processing callback:`, error);
                    blockProcessingErrors++;
                    if (blockProcessingErrors >= 5) {
                        blockProcessingErrors = 0;
                        await notifier.sendMessage(
                            `Error in block processing callback ${
                                (error as Error).message
                            }`
                        );
                    }
                    return reject(error);
                }
            });

            driverManager.on(
                'Trade',
                (
                    perpId,
                    traderAddr,
                    positionId,
                    digest,
                    orderFlags,
                    fTradeAmountBC,
                    fNewPos,
                    fPrice,
                    fLimitPrice
                ) => {
                    try {
                        if (perpId.toLowerCase() !== PERP_ID.toLowerCase()) {
                            return;
                        }
                        orderbook = removeOrderFromOrderbookByDigest(
                            digest,
                            orderbook
                        );
                        return;
                    } catch (error) {
                        console.log(`Error in the Trade event handler`, error);
                    }
                }
            );

            driverManager.on('PerpetualLimitOrderCancelled', (digest) => {
                try {
                    orderbook = removeOrderFromOrderbookByDigest(
                        digest,
                        orderbook
                    );
                } catch (error) {
                    console.log(
                        `Error in the PerpetualLimitOrderCancelled event handler`,
                        error
                    );
                }
            });
        } catch (e) {
            console.log(
                `[RELAYER_${
                    PERP_NAME || 'unknown'
                }] error in runForNumBlocksManager:`,
                e
            );
            return Promise.reject(e);
        }
    });
}

/**
 * Listen to the events generated by the LimitOrder contract instance
 * @param driverLOB a non-signing Limit Orderbook instance
 * @returns
 */
function listenForLimitOrderEvents<T>(driverLOB): Promise<void> {
    return new Promise((resolve, reject) => {
        try {
            driverLOB.once('error', (e) => {
                console.log(`driverLOB.once('error') triggered`, e);
                reject(e);
            });

            driverLOB.on(
                'PerpetualLimitOrderCreated',
                async (
                    perpId,
                    traderAddress,
                    fAmount,
                    limitPrice,
                    triggerPrice,
                    iDeadline,
                    referrerAddr,
                    flags,
                    fLeverage,
                    createdTimestamp,
                    digest
                ) => {
                    if (perpId.toLowerCase() !== PERP_ID.toLowerCase()) {
                        return;
                    }
                    let order = await driverLOB.orderOfDigest(digest);
                    orderbook = addOrderToOrderbook(
                        order as Order,
                        orderbook,
                        digest
                    );
                    console.log(`Got new order: `, order, orderbook);
                }
            );
        } catch (e) {
            console.log(
                `[RELAYER_${
                    PERP_NAME || 'unknown'
                }] error in listenForLimitOrderEvents:`,
                e
            );
            return Promise.reject(e);
        }
    });
}

async function initializeRelayer(signingLOBs, driverManager) {
    let driverLOB = signingLOBs[0];
    //the 0x0 value for the firstDigest actually. We start from it and ask for orders in batches of batchSize
    let lastDigest =
        '0x0000000000000000000000000000000000000000000000000000000000000000';
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
    result = result.filter(
        (o) =>
            o.iDeadline > Math.floor(new Date().getTime() / 1000) &&
            !isOrderFailed(o.digest)
    );
    orderbook = sortOrderbook(result);
    for (const order of orderbook) {
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
            let gasAmount =
                abiName === 'IPerpetualManager' ? 1_000_000 : 4_000_000;
            areRelayersFunded = await checkFundingHealth(signers, gasAmount);
            areRelayersFunded = areRelayersFunded.sort((a, b) => {
                let [relayerAddrA, numRelayingsA] = Object.entries(a)[0];
                let [relayerAddrB, numRelayingsB] = Object.entries(b)[0];
                return (
                    parseInt(numRelayingsB as any) -
                    parseInt(numRelayingsA as any)
                );
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
