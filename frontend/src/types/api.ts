export type User = {
  id: number;
  username: string;
  email: string;
  first_name?: string;
  last_name?: string;
};

export type Group = {
  id: number;
  name: string;
  description: string;
  created_by: number;
  created_at: string;
  updated_at: string;
};

export type ImportSummary = {
  total_rows: number;
  valid_rows: number;
  needs_review_rows: number;
  blocked_rows: number;
  skipped_rows: number;
  committed_rows: number;
  issues: {
    info: number;
    warning: number;
    error: number;
  };
  issue_codes: Record<string, number>;
};

export type ImportBatch = {
  id: number;
  group: number;
  uploaded_by: number;
  original_filename: string;
  display_filename: string;
  status: "PENDING_REVIEW" | "PARTIALLY_COMMITTED" | "COMMITTED" | "FAILED";
  total_rows: number;
  summary: ImportSummary;
  issue_count: number;
};

export type ImportIssue = {
  id: number;
  batch: number;
  row: number | null;
  row_number: number | null;
  row_status: "VALID" | "NEEDS_REVIEW" | "BLOCKED" | "SKIPPED" | "COMMITTED" | null;
  code: string;
  severity: "INFO" | "WARNING" | "ERROR";
  message: string;
  policy: string;
  suggested_action: string;
  status: "OPEN" | "APPROVED" | "REJECTED" | "RESOLVED";
  reviewed_at: string | null;
  resolution_note: string;
};

export type AiIssueExplanation = {
  code: string;
  count: number;
  open_count: number;
  approved_count: number;
  resolved_count: number;
  rejected_count: number;
  severity: "INFO" | "WARNING" | "ERROR";
  meaning: string;
  risk: string;
  recommended_action: string;
  samples: {
    row_number: number | null;
    message: string;
    suggested_action: string;
    status: string;
  }[];
};

export type AiImportExplanation = {
  batch_id: number;
  filename: string;
  display_filename: string;
  batch_status: string;
  total_rows: number;
  total_issues: number;
  severity_counts: {
    info: number;
    warning: number;
    error: number;
  };
  open_issue_count: number;
  open_severity_counts: {
    info: number;
    warning: number;
    error: number;
  };
  issue_status_counts: {
    open: number;
    approved: number;
    resolved: number;
    rejected: number;
  };
  row_counts: {
    valid_rows: number;
    needs_review_rows: number;
    blocked_rows: number;
    committed_rows: number;
    skipped_rows: number;
  };
  summary: string;
  commit_guidance: string[];
  issue_explanations: AiIssueExplanation[];
};

export type BalanceLine = {
  person: string;
  balance_paise: number;
  balance_rupees: string;
};

export type SuggestedSettlement = {
  from: string;
  to: string;
  amount_paise: number;
  amount_rupees: string;
};

export type GroupBalances = {
  group_id: number;
  group_name: string;
  balances: BalanceLine[];
  breakdown: Record<string, unknown[]>;
  suggested_settlements: SuggestedSettlement[];
};

export type AuditLog = {
  id: number;
  actor: number;
  action: string;
  entity_type: string;
  entity_id: string;
  note: string;
  metadata: Record<string, unknown>;
  created_at: string;
};
