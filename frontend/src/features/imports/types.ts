export type {
  ImportBatch,
  ImportIssue,
  ImportSummary,
  AiImportExplanation,
  AiIssueExplanation,
} from "../../types/api";

export type Tone =
  | "green"
  | "blue"
  | "amber"
  | "red"
  | "violet"
  | "neutral";

export type ImportDecision =
  | "APPROVE"
  | "REJECT"
  | "SKIP_ROW"
  | "KEEP_ROW"
  | "IMPORT_AS_SETTLEMENT"
  | "FIX_LATER";

export type ImportCommitResult = {
  batch_id?: number;
  committed_by?: number;
  committed_expenses: number;
  committed_settlements: number;
  skipped_rows: number;
  blocked_rows: number;
  errors: Array<
    | string
    | {
        row_id?: number;
        row_number?: number;
        message?: string;
      }
  >;
  batch_status?: string;
};

export const ERROR_ISSUE_CODES = [
  "INVALID_DATE",
  "INVALID_PERCENTAGE_TOTAL",
  "MISSING_CURRENCY",
  "MISSING_PAYER",
  "UNKNOWN_MEMBER",
  "ZERO_AMOUNT",
  "INVALID_AMOUNT",
  "INVALID_SPLIT_TYPE",
  "INVALID_EXACT_TOTAL",
  "INVALID_SHARE_VALUE",
  "MISSING_PARTICIPANTS",
] as const;

export const REVIEW_ISSUE_CODES = [
  "AMBIGUOUS_DATE",
  "AMOUNT_PRECISION",
  "DUPLICATE_CONFLICT",
  "INACTIVE_MEMBER",
  "POSSIBLE_DUPLICATE",
  "SETTLEMENT_AS_EXPENSE",
  "SPLIT_DETAILS_WITH_EQUAL",
  "USD_CONVERTED",
  "NEGATIVE_AMOUNT",
] as const;

export function getImportStatusTone(status?: string): Tone {
  if (status === "COMMITTED") return "green";
  if (status === "PARTIALLY_COMMITTED") return "amber";
  if (status === "PENDING_REVIEW") return "violet";
  if (status === "FAILED") return "red";
  return "neutral";
}

export function getSeverityTone(severity?: string): Tone {
  if (severity === "ERROR") return "red";
  if (severity === "WARNING") return "amber";
  if (severity === "INFO") return "blue";
  return "neutral";
}

export function getIssueStatusTone(status?: string): Tone {
  if (status === "OPEN") return "amber";
  if (status === "APPROVED") return "green";
  if (status === "RESOLVED") return "green";
  if (status === "REJECTED") return "red";
  return "neutral";
}

export function getIssueCodeTone(code: string) {
  if (ERROR_ISSUE_CODES.includes(code as (typeof ERROR_ISSUE_CODES)[number])) {
    return "border-ledger-red/20 bg-ledger-red/10 text-ledger-red";
  }

  if (
    REVIEW_ISSUE_CODES.includes(code as (typeof REVIEW_ISSUE_CODES)[number])
  ) {
    return "border-ledger-amber/20 bg-ledger-amber/10 text-ledger-amber";
  }

  return "border-ledger-blue/20 bg-ledger-blue/10 text-ledger-blue";
}

export function formatIssueCode(code: string) {
  return code
    .toLowerCase()
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}
