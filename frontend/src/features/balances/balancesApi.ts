import { api } from "../../lib/api";
import { endpoints } from "../../lib/endpoints";
import type { GroupBalances } from "./types";

export async function getGroupBalances(groupId: number) {
  const response = await api.get<GroupBalances>(
    endpoints.expenses.groupBalances(groupId),
  );

  return response.data;
}
