import { getGroupBalances } from "../balances/balancesApi";
import { getImportBatches } from "../imports/importsApi";
import type { GroupBalances, ImportBatch } from "./types";

export type DashboardData = {
  batches: ImportBatch[];
  latestBatch: ImportBatch | null;
  balances: GroupBalances;
};

export async function getDashboardData(
  groupId: number,
): Promise<DashboardData> {
  const [batches, balances] = await Promise.all([
    getImportBatches(),
    getGroupBalances(groupId),
  ]);

  const groupBatches = batches.filter((batch) => batch.group === groupId);

  return {
    batches: groupBatches,
    latestBatch: groupBatches[0] ?? null,
    balances,
  };
}
