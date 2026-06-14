import type { AuditLog } from "../../types/api";

export type { AuditLog };

export type AuditTone =
  | "green"
  | "blue"
  | "amber"
  | "red"
  | "violet"
  | "neutral";

export type AuditStats = {
  total: number;
  uploads: number;
  reviews: number;
  commits: number;
};

export function calculateAuditStats(logs: AuditLog[]): AuditStats {
  return {
    total: logs.length,
    uploads: logs.filter((log) => log.action.includes("UPLOAD")).length,
    reviews: logs.filter((log) => log.action.includes("REVIEW")).length,
    commits: logs.filter((log) => log.action.includes("COMMIT")).length,
  };
}

export function getAuditActionTone(action: string): AuditTone {
  if (action.includes("UPLOAD")) return "blue";
  if (action.includes("REVIEW")) return "violet";
  if (action.includes("COMMIT")) return "green";
  if (action.includes("DELETE") || action.includes("REMOVE")) return "red";

  return "neutral";
}

export function getAuditActionSummary(log: AuditLog) {
  if (log.note) return log.note;

  if (log.action.includes("UPLOAD")) {
    return "A CSV import batch was uploaded and analyzed by the backend.";
  }

  if (log.action.includes("REVIEW")) {
    return "An import issue review decision was recorded.";
  }

  if (log.action.includes("COMMIT")) {
    return "Safe rows were committed into the financial ledger.";
  }

  return `Action recorded for entity ${log.entity_type}.`;
}

export function formatAuditDateTime(value: string) {
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}