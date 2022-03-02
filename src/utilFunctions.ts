import { walletUtils, perpQueries, perpUtils } from '@sovryn/perpetual-swap';
const { getSigningManagersConnectedToRandomNode, getNumTransactions } =
  walletUtils;

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
