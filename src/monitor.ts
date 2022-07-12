/**
 *  Accepts client requests and returns internal state of the relayer
 * 
 */
const axios = require("axios");
const { formatEther } = require("ethers/lib/utils");

import * as walletUtils from '@sovryn/perpetual-swap/dist/scripts/utils/walletUtils';
const {getReadOnlyContractInstance} = walletUtils;


const { PUBLIC_NODE_PROVIDER, BLOCK_EXPLORER, BALANCE_THRESHOLD, PERP_NAME, PAYMASTER_ADDRESS } = process.env;
import dbCtrl from "./db";


class MonitorController {
    private driverManager;
    private signingManagers;
    private positions;

    start(driverManager, signingManagers, positions) {
        this.positions = positions;
        this.signingManagers = signingManagers;
        this.driverManager = driverManager;
    }

    /**
     * Wrapper for health signals, called from client
     */
    async getSignals(cb: any = null) {
        const resp = {
            blockInfoLn: await this.getCurrentBlockPrivateNode(),
            blockInfoPn: await this.getCurrentBlockPublicNode(),
            accountInfoLiq: await this.getAccountsInfo(null),
            positionInfo: await this.getOpenOrders(),
            perpName: process.env.PERP_NAME,
            //  liqInfo: await this.getOpenLiquidations(),
        };
        if (typeof cb === "function") cb(resp);
        else return resp;
    }

    async getTotals(cb, last24h) {
        // console.log(last24h ? "get last 24h totals" : "get totals");
        const liquidator = await dbCtrl.getTotals("liquidator", last24h);
        const resp = {
            totalLiquidations: liquidator?.totalActionsNumber,
            totalLiquidatorProfit: Number(liquidator?.profit).toFixed(6),
        };
        if (typeof cb === "function") cb(resp);
        else return resp;
    }

    getCurrentBlockPublicNode() {
        let p = this;
        return new Promise((resolve) => {
            axios({
                method: "post",
                url: PUBLIC_NODE_PROVIDER,
                data: {
                    method: "eth_blockNumber",
                    jsonrpc: "2.0",
                    params: [],
                    id: 1,
                },
                headers: { "Content-Type": "application/json" },
            })
                .then((response) => {
                    if (response.data && response.data.result) {
                        const res = parseInt(response.data.result);
                        resolve(res);
                    } else resolve(-1);
                })
                .catch((e) => {
                    console.error("error getting block-nr from public node");
                    console.error(e);
                    resolve(-1);
                });
        });
    }

    async getCurrentBlockPrivateNode() {
        try {
            let bNr = await this.driverManager.provider.getBlockNumber();
            bNr = parseInt(bNr);
            return bNr;
        } catch (e) {
            console.error("error getting block-nr from private node");
            //console.error(e);
            return -1;
        }
    }

    getNetworkData(cb) {
        const resp = {
            blockExplorer: BLOCK_EXPLORER,
        };
        if (typeof cb === "function") cb(resp);
        else return resp;
    }

    async getAccountsInfo(cb) {
        let accountWithInfo = Array();

        let dmAddress = await this.driverManager.signer.getAddress();
        let [dmBalance, dmLastBlock] = await Promise.all([
            this.driverManager.provider.getBalance(dmAddress).then( b => formatEther(b)),
            this.driverManager.provider.getBlockNumber().then( bNr => parseInt(bNr)).catch(e => -2),
        ]);

        accountWithInfo.push({
            address: dmAddress,
            balance: dmBalance,
            balanceThreshold: -1,
            overThreshold: true,
            accountType: 'driverManager',
            lastBlock: dmLastBlock,
            nodeUrl: this.driverManager.provider.connection.url,
        });
        
        let balancesPromises = Array();
        let addressesPromises = Array();
        let lastBlockPromises = Array();
        for (const manager of this.signingManagers) {
            addressesPromises.push(manager.signer.getAddress());
        }
        let walletsAddresses = await Promise.all(addressesPromises);

        let i = 0;        
        for (const wallet of walletsAddresses) {
            balancesPromises.push(
                this.driverManager.provider
                    .getBalance(wallet)
                    .then((balance) => formatEther(balance))
                    .catch((e) => {
                        console.log(`Error getting balance for account: ${e}`);
                        return 0;
                    })
            );

            lastBlockPromises.push(this.signingManagers[i].provider.getBlockNumber().then( bNr => parseInt(bNr)).catch(e => -2));
        }

        let balances = await Promise.all(balancesPromises);

        let lastBlocks = await Promise.all(lastBlockPromises);
        
        for (let i = 0; i < balances.length; i++) {
            accountWithInfo.push({
                address: walletsAddresses[i],
                balance: balances[i],
                balanceThreshold: BALANCE_THRESHOLD,
                overThreshold: balances[i] > parseInt(BALANCE_THRESHOLD || '0'),
                accountType: 'signingManager',
                lastBlock: lastBlocks[i],
                nodeUrl: this.signingManagers[i].provider.connection.url
            });
        }
        let paymaster = await getReadOnlyContractInstance(PAYMASTER_ADDRESS, [this.driverManager.provider.connection.url], 'RbtcPaymaster');
        let paymasterBalance = await paymaster.getRelayHubDeposit();
        paymasterBalance = formatEther(paymasterBalance);

        accountWithInfo.push({
            address: PAYMASTER_ADDRESS,
            balance: paymasterBalance,
            balanceThreshold: 0.1,
            overThreshold: paymasterBalance > 0.1,
            accountType: 'paymaster',
            lastBlock: lastBlocks[balances.length - 1],
            nodeUrl: paymaster.provider.connection.url,
        });

        if (typeof cb === "function") cb(accountWithInfo);

        return accountWithInfo;
    }

    getOpenOrders() {
        return Object.keys(this.positions).length;
    }

    async getOpenOrdersDetails(cb) {
        if (typeof cb === "function") cb(this.positions);
    }
    
}

export default new MonitorController();
