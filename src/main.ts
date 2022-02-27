let configPath = process.argv?.[2] || "../.env";
require("dotenv").config({ path: configPath });
import { walletUtils, perpQueries, perpUtils } from "@sovryn/perpetual-swap";

const { MANAGER_ADDRESS, NODE_URLS, OWNER_ADDRESS, MAX_BLOCKS_BEFORE_RECONNECT, TELEGRAM_BOT_SECRET, TELEGRAM_CHANNEL_ID } = process.env;
const { getSigningManagersConnectedToRandomNode, getNumTransactions } = walletUtils;
import TelegramNotifier from "./notifier/TelegramNotifier";
import { v4 as uuidv4 } from "uuid";
const fetch = require("node-fetch");
const { queryTraderState, queryAMMState, queryPerpParameters } = perpQueries;

let orderbook = Array();

const runId = uuidv4();
console.log(`runId: ${runId}`);
let notifier = getTelegramNotifier(TELEGRAM_BOT_SECRET, TELEGRAM_CHANNEL_ID);

(async function main() {
    try {
        let [driverManager, ...signingManagers] = await getConnectedAndFundedSigners(0, 11);

        orderbook = await initializeRelayer(signingManagers);

        if(process.env.HEARTBEAT_SHOULD_RESTART_URL){
            let intervalId = setInterval( () => shouldRestart(runId, 'LIQ_BLOCK_PROCESSED'), 5_000);
        } else {
            console.warn("Env var HEARTBEAT_SHOULD_RESTART_URL is not set, so if the nodes are pausing the connection, can not restart automatically.");
        }

        while (true) {
            try {
                let res = await runForNumBlocks(driverManager, signingManagers, MAX_BLOCKS_BEFORE_RECONNECT);
                console.log(`Ran for ${MAX_BLOCKS_BEFORE_RECONNECT}`);
            } catch (error) {
                console.log(`Error in while(true):`, error);
                // await notifier.sendMessage(`Error in while(true): ${(error as any).message}`);
            }

            //remove event listeners and reconnect
            driverManager.provider.removeAllListeners();
            driverManager.removeAllListeners();

            [driverManager, ...signingManagers] = await getConnectedAndFundedSigners(0, 11);
        }
    } catch (error) {
        console.log(`General error while liquidating users, exiting process`, error);
        await notifier.sendMessage(`General error while liquidating users: ${(error as any).message}. Exiting.`);
        process.exit(1);
    }
})();

/**
 * Run the realyer script for a period of maxBlocks
 * @param signingManager a signing manager contract instance
 * @param maxBlocks the number of blocks after the current readManager gets re-connected
 * @returns
 */
 function runForNumBlocks<T>(driverManager, signingManagers, maxBlocks): Promise<void> {
    return new Promise((resolve, reject) => {
    })
 }

async function initializeRelayer(signingManagers){
    return [];
}

async function shouldRestart(runId, heartbeatCode){
    try {
        let heartbeatUrl = process.env.HEARTBEAT_SHOULD_RESTART_URL;
        if (!heartbeatUrl) {
            console.warn("Env var HEARTBEAT_SHOULD_RESTART_URL is not set, so if the nodes are pausing the connection, can not restart automatically.");
            return;
        }
        
        let res = await fetch(heartbeatUrl + `/${runId}/${heartbeatCode}`, {
            method: "GET",
            headers: {
                "Accept": "application/json",
                "Content-Type": "application/json",
            },            
        });
        if (res.statusText.toLowerCase() !== "ok") {
            let responseText = await res.text();
            let msg = `Error when shouldRestart: ${res.statusText}; response text: ${responseText}`;
            console.warn(msg);
            await notifier.sendMessage(msg);
            return;
        }

        let restartRes = await res.json();
        if(restartRes?.shouldRestart){
            console.warn(`Restarting ${runId}. Time since last heartbeat: ${res?.timeSinceLastHeartbeat}`);
            process.exit(1);
        }
    } catch (error) {
        console.warn(`Error when shouldRestart:`, error);
    }
}

async function getConnectedAndFundedSigners(fromWallet, numSigners, includeDriverManager = true) {
    let bscNodeURLs = JSON.parse(NODE_URLS || "[]");
    let signers = Array();
    let areLiquidatorsFunded = Array();
    let numRetries = 0;
    let maxRetries = 10;
    let included = false;
    let fundedSigners = Array();
    let fundedWalletAddresses = Array();
    let timeStart = new Date().getTime();
    while (true) {
        try {
            //get an array of signingWallets
            signers = getSigningManagersConnectedToRandomNode(MANAGER_ADDRESS, MNEMONIC, bscNodeURLs, fromWallet, numSigners) || [];

            //get the number of liquidations each can make [{[liquidatorAddress]: numLiquidations}]
            //this also checks whether the signingManagers are connected and the node responds properly
            // areLiquidatorsFunded = await checkFundingHealth(signers);
            areLiquidatorsFunded = areLiquidatorsFunded.sort((a, b) => {
                let [liqAddrA, numLiquidationsA] = Object.entries(a)[0];
                let [liqAddrB, numLiquidationsB] = Object.entries(b)[0];
                return parseInt(numLiquidationsB as any) - parseInt(numLiquidationsA as any);
            });
            for (let i = 0; i < areLiquidatorsFunded.length; i++) {
                let liquidator = areLiquidatorsFunded[i];
                let [liqAddr, numLiquidations] = Object.entries(liquidator)[0];
                if (typeof numLiquidations !== "number") {
                    console.log(`Unable to instantiate signer with address ${liqAddr}, i=${i}, ${(numLiquidations as any).toString()}`);
                    continue;
                }
                if (numLiquidations > 0) {
                    fundedSigners.push(signers[i]);
                    fundedWalletAddresses.push(liquidator);
                    continue;
                }
                if (includeDriverManager && !included) {
                    fundedSigners.unshift(signers[i]);
                    fundedWalletAddresses.unshift(liquidator);
                    included = true;
                }
            }
            if (fundedSigners.length === 0 || (includeDriverManager && fundedSigners.length === 1)) {
                let msg = `[${new Date()}] WARN: there are no funded liquidators. Can not liquidate because there are no tx fee sufficient funds in the selected wallets. Retrying! ${JSON.stringify(
                    areLiquidatorsFunded,
                    null,
                    2
                )}`;
                console.warn(msg);
                throw new Error(msg);
            }
            break;
        } catch (error) {
            console.log;
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
    console.log(`(${timeEnd - timeStart} ms) Funded liquidator wallets after ${numRetries} connection attempts:`, fundedWalletAddresses);
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