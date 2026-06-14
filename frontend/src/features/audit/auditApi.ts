import { api } from "../../lib/api";
import { endpoints } from "../../lib/endpoints";
import type { AuditLog } from "./types";

export async function getAuditLogs() {
  const response = await api.get<AuditLog[]>(endpoints.audit.list);

  return response.data;
}