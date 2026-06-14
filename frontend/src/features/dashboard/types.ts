import type {
  AuditLog,
  GroupBalances,
  ImportBatch,
  ImportSummary,
} from "../../types/api";

export type { AuditLog, GroupBalances, ImportBatch, ImportSummary };

export type DashboardTone =
  | "green"
  | "blue"
  | "amber"
  | "red"
  | "violet"
  | "neutral";

export type DashboardImportStats = {
  totalRows: number;
  committedRows: number;
  reviewRows: number;
  blockedRows: number;
  totalIssues: number;
};

export type RiskAssessment = {
  label: string;
  tone: DashboardTone;
  description: string;
};

export function getDashboardImportStats(
  batch: ImportBatch | null | undefined,
): DashboardImportStats {
  const summary = batch?.summary;

  return {
    totalRows: summary?.total_rows ?? 0,
    committedRows: summary?.committed_rows ?? 0,
    reviewRows: summary?.needs_review_rows ?? 0,
    blockedRows: summary?.blocked_rows ?? 0,
    totalIssues: batch?.issue_count ?? 0,
  };
}

export function getRiskLevel(
  summary: ImportSummary | null | undefined,
): RiskAssessment {
  if (!summary) {
    return {
      label: "No batch",
      tone: "neutral",
      description: "Upload a CSV to generate risk analysis.",
    };
  }

  if (summary.blocked_rows > 0 || summary.issues.error > 0) {
    return {
      label: "High risk",
      tone: "red",
      description: "Some rows are blocked because they could corrupt balances.",
    };
  }

  if (summary.needs_review_rows > 0 || summary.issues.warning > 0) {
    return {
      label: "Review risk",
      tone: "amber",
      description: "Rows need operator review before a safe commit.",
    };
  }

  return {
    label: "Safe",
    tone: "green",
    description: "No blocking risk detected in this import batch.",
  };
}

export function getTopIssueCodes(
  summary: ImportSummary | null | undefined,
  limit = 5,
) {
  if (!summary) return [];

  return Object.entries(summary.issue_codes)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit);
}

export function getBalanceSnapshot(
  balances: GroupBalances | null | undefined,
) {
  const lines = balances?.balances ?? [];

  const creditors = lines.filter((line) => line.balance_paise > 0);
  const debtors = lines.filter((line) => line.balance_paise < 0);

  const totalReceivable = creditors.reduce(
    (sum, line) => sum + line.balance_paise,
    0,
  );

  const totalPayable = Math.abs(
    debtors.reduce((sum, line) => sum + line.balance_paise, 0),
  );

  return {
    memberCount: lines.length,
    creditorCount: creditors.length,
    debtorCount: debtors.length,
    totalReceivable,
    totalPayable,
    settlementCount: balances?.suggested_settlements.length ?? 0,
  };
}

export function formatPaiseAsRupees(paise: number) {
  return `₹${(paise / 100).toFixed(2)}`;
}