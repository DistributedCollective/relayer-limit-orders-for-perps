const configFileName = '.env';
const path = require('path');
let configPath = path.resolve(__dirname, '../../', configFileName);
require('dotenv').config({ path: configPath });

import { walletUtils, perpQueries, perpUtils } from "@sovryn/perpetual-swap";
import { ABK64x64ToFloat, dec18ToFloat, floatToABK64x64, toDec18 } from "@sovryn/perpetual-swap/dist/scripts/utils/perpMath";
import { getSigningContractInstance } from "@sovryn/perpetual-swap/dist/scripts/utils/walletUtils";
const { getSigningManagersConnectedToRandomNode } = walletUtils;
const { MANAGER_ADDRESS, ORDER_BOOK_ADDRESS, TOKEN_ADDRESS, NODE_URLS, OWNER_ADDRESS, MAX_BLOCKS_BEFORE_RECONNECT, TELEGRAM_BOT_SECRET, TELEGRAM_CHANNEL_ID } = process.env;
const MNEMONIC = process.env.MNEMONIC;
if (!MNEMONIC) {
  console.log(`ERROR: Mnemonic is not present.`);
  process.exit(1);
}

/**
 * Script to reduce the allowance of a wallet address to 0 for both ORDER_BOOK and MANAGER_ADDRESS
 * run with `ts-node src/extra/decreaseAllowance.ts <idx>` where idx is the address number in the wallet
 */


(async function main() {
  try {
    let idx = parseInt(process.argv?.[2]);
    
    let bscNodeURLs = JSON.parse(NODE_URLS || "[]");
    let signersLoBs = getSigningContractInstance(ORDER_BOOK_ADDRESS, MNEMONIC, bscNodeURLs, 'LimitOrderBook', idx, 1) || [];
    let signerLoB = signersLoBs[0];
    signersLoBs = getSigningManagersConnectedToRandomNode(MANAGER_ADDRESS, MNEMONIC, bscNodeURLs, idx, 1) || [];

    let traderAddress = await signerLoB.signer.getAddress();
    let tokenSigners = getSigningContractInstance(TOKEN_ADDRESS, MNEMONIC, bscNodeURLs, 'ERC20', idx, 1) || [];
    let tokenSigner = tokenSigners[0];
    let approved = await tokenSigner.allowance(traderAddress, MANAGER_ADDRESS);
    console.log(`Existing MANAGER allowance: ${dec18ToFloat(approved)}`);
    let decreaseTx = await tokenSigner.decreaseAllowance(MANAGER_ADDRESS, approved);
    await decreaseTx.wait();

    
    approved = await tokenSigner.allowance(traderAddress, ORDER_BOOK_ADDRESS);
    console.log(`Existing ORDER_BOOK allowance: ${dec18ToFloat(approved)}`);
    decreaseTx = await tokenSigner.decreaseAllowance(ORDER_BOOK_ADDRESS, approved);
    await decreaseTx.wait();
    
    let [managerAllowance, orderbookAllowance] = await Promise.all([
      tokenSigner.allowance(traderAddress, MANAGER_ADDRESS),
      tokenSigner.allowance(traderAddress, ORDER_BOOK_ADDRESS),
    ]);
    
    console.log(`New allowances, MANAGER: ${dec18ToFloat(managerAllowance)}, ORDER_BOOK: ${dec18ToFloat(orderbookAllowance)}`);
    
    
  } catch (e) {
    console.log(`error: `, e);
  }
})()