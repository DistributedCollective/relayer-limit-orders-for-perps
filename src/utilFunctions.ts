import { walletUtils, perpQueries, perpUtils } from '@sovryn/perpetual-swap';
const { getSigningManagersConnectedToRandomNode, getNumTransactions } =
    walletUtils;

export type Order = {
    iPerpetualId: string;
    address: string;
    fAmount: number;
    fLimitPrice: number;
    fTriggerPrice: number;
    iDeadline: number;
    referrerAddr: string;
    flags: number;
    fLeverage: number; // 0 if deposit and trade separat;
    createdTimestamp: number;
};

export async function checkFundingHealth(
    accounts,
    gasAmount: number = 4_000_000
) {
    const accCheckPromises = Array();
    for (const account of accounts) {
        accCheckPromises.push(getNumTransactions(account, gasAmount));
    }

    const res = await Promise.all(accCheckPromises);
    return res;
}

export async function getPerpetualIds(manager): Promise<any[] | undefined> {
    try {
        let perpertualIds = Array();
        let poolCount = (await manager.getPoolCount()).toNumber();
        for (let i = 1; i < poolCount + 1; i++) {
            let perpetualCount = await manager.getPerpetualCountInPool(i);
            for (let j = 0; j < perpetualCount; j++) {
                let perpId = await manager.getPerpetualId(i, j);
                perpertualIds.push(perpId);
            }
        }
        return perpertualIds;
    } catch (error) {
        console.log(`Error in getPerpetualIdsSerial()`, error);
    }
}

export function addOrderToOrderbook(order, orderbook) {
    orderbook.push(order);
    return sortOrderbook(orderbook);
}

export function sortOrderbook(orderbook: Order[] = []) {
    let asks = orderbook
        .filter((o) => o.fAmount < 0)
        .sort((a, b) => b.fLimitPrice - a.fLimitPrice);
    let bids = orderbook
        .filter((o) => o.fAmount > 0)
        .sort((a, b) => a.fLimitPrice - b.fLimitPrice);
    return asks.concat(bids);
}
