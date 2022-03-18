import { walletUtils, perpQueries, perpUtils } from '@sovryn/perpetual-swap';
import { perpMath } from '@sovryn/perpetual-swap';
import { ABK64x64ToFloat } from '@sovryn/perpetual-swap/dist/scripts/utils/perpMath';
import { Contract, BigNumber as BN, BigNumberish, BytesLike, } from "ethers";
const ethers = require('ethers');
const { floatToABK64x64 } = perpMath;
const { createSignature } = perpUtils;
const { getSigningManagersConnectedToRandomNode, getNumTransactions } =
    walletUtils;
const ONE_64x64 = BN.from("0x010000000000000000");

export type OrderTS = {
    iPerpetualId: string;
    traderAddr: string;
    fAmount: number;
    fLimitPrice: number;
    fTriggerPrice: number;
    iDeadline: number;
    referrerAddr: string;
    flags: number;
    fLeverage: number; // 0 if deposit and trade separat;
    createdTimestamp: number;
};

type Order = {
  iPerpetualId: BytesLike;
  traderAddr: string;
  fAmount: BigNumberish;
  fLimitPrice: number;
  fTriggerPrice: BigNumberish;
  iDeadline: BigNumberish;
  referrerAddr: string;
  flags: BigNumberish;
  fLeverage: BigNumberish;
  createdTimestamp: BigNumberish;
};

const MASK_CLOSE_ONLY = BN.from("0x80000000");
const MASK_MARKET_ORDER = BN.from("0x40000000");
const MASK_STOP_ORDER = BN.from("0x20000000");
const MASK_TAKE_PROFIT_ORDER = BN.from("0x10000000");
const MASK_USE_TARGET_LEVERAGE = BN.from("0x08000000");
const MASK_LIMIT_ORDER = BN.from("0x04000000");
const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000"; 

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
        console.log(`==============`, poolCount)
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

export async function createLimitOrder(limitOrderBook: Contract, perpetualId, tradeAmount, limitPrice, account, signer, managerAddr : string, deadline, createdTimestamp, referrer = ZERO_ADDRESS, leverage = null, executeOrder=false) {

  if (createdTimestamp == null) {
      createdTimestamp = Math.round(new Date().getTime() / 1000);
  }

  if (deadline == null) {
      deadline = createdTimestamp + 86400;
  }

  if (leverage == null) {
      leverage = floatToABK64x64(0);
  }

  let order: Order = {
      iPerpetualId: perpetualId,
      traderAddr: account,
      fAmount: floatToABK64x64(tradeAmount).toString(),
      fLimitPrice: floatToABK64x64(limitPrice).toString() as any,
      fTriggerPrice: floatToABK64x64(0).toString() as any,
      iDeadline: deadline,
      referrerAddr: referrer,
      flags: MASK_LIMIT_ORDER.toNumber(),
      fLeverage: leverage.toString(),
      createdTimestamp: createdTimestamp,
  };
  let chainId = (await limitOrderBook.provider.getNetwork()).chainId;
  let signature = await createSignature(order, true, signer, managerAddr, chainId);

  let tx1 = await limitOrderBook.createLimitOrder(order, signature, { gasLimit: 3_000_000 });
  
  tx1 = await tx1.wait();
  console.log(`---------order created in orderbook`, tx1);
  

  // tx1 = await limitOrderBook.executeLimitOrder(order, { gasLimit: 3_000_000 });

  return tx1;
}

export function orderToOrderTS(order: Order): OrderTS{
  
  let res: OrderTS = {
    iPerpetualId: order.iPerpetualId.toString(),
    traderAddr: order.traderAddr,
    fAmount: ABK64x64ToFloat(order.fAmount as BN),
    fLimitPrice: order.fLimitPrice,
    fTriggerPrice: ABK64x64ToFloat(order.fTriggerPrice as BN),
    iDeadline: (order.iDeadline as BN).toNumber(),
    referrerAddr: order.referrerAddr,
    flags: order.flags as number,
    fLeverage: ABK64x64ToFloat(order.fLeverage as BN), // 0 if deposit and trade order.
    createdTimestamp: (order.createdTimestamp as BN).toNumber(),
  }
  return res;
}

export function getMatchingOrders(orderbook: OrderTS[], markPrice: number): OrderTS[]{

  return orderbook.filter( o => orderTradeable(o, markPrice))
}

function orderTradeable(order: Order, markPrice: number): Boolean{

  // Buy orders
  if(order.fAmount > 0){
    if(order.fTriggerPrice && markPrice <= order.fTriggerPrice) return true; //stop loss order
    if(!order.fTriggerPrice && markPrice <= order.fLimitPrice) return true;
    return false;
  }

  //Sell orders
  if(order.fTriggerPrice && markPrice >= order.fTriggerPrice) return true; //stop loss order
  if(!order.fTriggerPrice && markPrice >= order.fLimitPrice) return true;
  return false;
}

export async function executeOrder(signerLoB, order: OrderTS ){
  try {
    await signerLoB.executeLimitOrder(order)
  } catch (error) {
    
  }
}