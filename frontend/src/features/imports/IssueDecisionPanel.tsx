import { useMemo, useState } from "react";
import axios from "axios";
import {
  CheckCircle2,
  CircleSlash,
  FileCheck2,
  Landmark,
  Loader2,
  PauseCircle,
  SkipForward,
} from "lucide-react";
import { applyImportIssueDecision } from "./importsApi";
import type { ImportIssue } from "./types";

type Decision =
  | "APPROVE"
  | "REJECT"
  | "SKIP_ROW"
  | "KEEP_ROW"
  | "IMPORT_AS_SETTLEMENT"
  | "FIX_LATER";

type DecisionOption = {
  decision: Decision;
  label: string;
  helper: string;
  icon: typeof CheckCircle2;
  className: string;
};

type IssueDecisionPanelProps = {
  issue: ImportIssue;
  onDecisionApplied: () => void;
};

function formatDecisionError(error: unknown) {
  if (!axios.isAxiosError(error)) {
    return "Decision failed. Please try again.";
  }

  const data = error.response?.data;

  if (typeof data === "string") {
    return data;
  }

  if (data?.detail) {
    return String(data.detail);
  }

  if (data?.decision) {
    return `Decision failed: ${String(data.decision)}`;
  }

  if (data?.non_field_errors) {
    return `Decision failed: ${String(data.non_field_errors)}`;
  }

  return `Decision failed${error.response?.status ? ` (${error.response.status})` : ""}.`;
}

function getDecisionOptions(issue: ImportIssue): DecisionOption[] {
  if (issue.status !== "OPEN") {
    return [];
  }

  if (issue.code === "SETTLEMENT_AS_EXPENSE") {
    return [
      {
        decision: "IMPORT_AS_SETTLEMENT",
        label: "Import as settlement",
        helper: "Creates settlement instead of expense",
        icon: Landmark,
        className:
          "border-ledger-green/30 bg-ledger-green/10 text-ledger-green hover:bg-ledger-green/15",
      },
      {
        decision: "SKIP_ROW",
        label: "Skip row",
        helper: "Do not import this row or its other issues",
        icon: SkipForward,
        className:
          "border-ledger-amber/30 bg-ledger-amber/10 text-ledger-amber hover:bg-ledger-amber/15",
      },
    ];
  }

  if (issue.code === "DUPLICATE_CONFLICT") {
    return [
      {
        decision: "KEEP_ROW",
        label: "Keep row",
        helper: "Treat this row as intentional",
        icon: FileCheck2,
        className:
          "border-ledger-blue/30 bg-ledger-blue/10 text-ledger-blue hover:bg-ledger-blue/15",
      },
      {
        decision: "SKIP_ROW",
        label: "Skip row",
        helper: "Avoid duplicate import and close row issues",
        icon: SkipForward,
        className:
          "border-ledger-amber/30 bg-ledger-amber/10 text-ledger-amber hover:bg-ledger-amber/15",
      },
      {
        decision: "FIX_LATER",
        label: "Fix later",
        helper: "Leave issue open",
        icon: PauseCircle,
        className:
          "border-white/10 bg-white/[0.04] text-ledger-muted hover:bg-white/[0.07]",
      },
    ];
  }

  if (issue.code === "POSSIBLE_DUPLICATE") {
    return [
      {
        decision: "KEEP_ROW",
        label: "Keep row",
        helper: "Confirm it is not duplicate",
        icon: FileCheck2,
        className:
          "border-ledger-blue/30 bg-ledger-blue/10 text-ledger-blue hover:bg-ledger-blue/15",
      },
      {
        decision: "SKIP_ROW",
        label: "Skip row",
        helper: "Remove duplicate-like row and close row issues",
        icon: SkipForward,
        className:
          "border-ledger-amber/30 bg-ledger-amber/10 text-ledger-amber hover:bg-ledger-amber/15",
      },
    ];
  }

  if (
    [
      "USD_CONVERTED",
      "AMBIGUOUS_DATE",
      "AMOUNT_PRECISION",
      "INACTIVE_MEMBER",
      "NEGATIVE_AMOUNT",
      "SPLIT_DETAILS_WITH_EQUAL",
    ].includes(issue.code)
  ) {
    return [
      {
        decision: "APPROVE",
        label: "Approve",
        helper: "Allow this reviewed issue",
        icon: CheckCircle2,
        className:
          "border-ledger-green/30 bg-ledger-green/10 text-ledger-green hover:bg-ledger-green/15",
      },
      {
        decision: "SKIP_ROW",
        label: "Skip row",
        helper: "Do not import this row or its other issues",
        icon: SkipForward,
        className:
          "border-ledger-amber/30 bg-ledger-amber/10 text-ledger-amber hover:bg-ledger-amber/15",
      },
      {
        decision: "FIX_LATER",
        label: "Fix later",
        helper: "Leave issue open",
        icon: PauseCircle,
        className:
          "border-white/10 bg-white/[0.04] text-ledger-muted hover:bg-white/[0.07]",
      },
    ];
  }

  if (
    [
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
    ].includes(issue.code)
  ) {
    return [
      {
        decision: "SKIP_ROW",
        label: "Skip row",
        helper: "Safest option without row editing; closes row issues",
        icon: SkipForward,
        className:
          "border-ledger-amber/30 bg-ledger-amber/10 text-ledger-amber hover:bg-ledger-amber/15",
      },
      {
        decision: "FIX_LATER",
        label: "Fix later",
        helper: "Keep blocked for manual correction",
        icon: PauseCircle,
        className:
          "border-white/10 bg-white/[0.04] text-ledger-muted hover:bg-white/[0.07]",
      },
      {
        decision: "REJECT",
        label: "Reject",
        helper: "Reject and skip the whole row",
        icon: CircleSlash,
        className:
          "border-ledger-red/30 bg-ledger-red/10 text-ledger-red hover:bg-ledger-red/15",
      },
    ];
  }

  return [
    {
      decision: "APPROVE",
      label: "Approve",
      helper: "Allow after review",
      icon: CheckCircle2,
      className:
        "border-ledger-green/30 bg-ledger-green/10 text-ledger-green hover:bg-ledger-green/15",
    },
    {
      decision: "SKIP_ROW",
      label: "Skip row",
      helper: "Do not import row or its other issues",
      icon: SkipForward,
      className:
        "border-ledger-amber/30 bg-ledger-amber/10 text-ledger-amber hover:bg-ledger-amber/15",
    },
  ];
}

export function IssueDecisionPanel({
  issue,
  onDecisionApplied,
}: IssueDecisionPanelProps) {
  const [loadingDecision, setLoadingDecision] = useState<Decision | null>(null);
  const [localMessage, setLocalMessage] = useState("");

  const options = useMemo(() => getDecisionOptions(issue), [issue]);

  async function applyDecision(decision: Decision) {
    setLoadingDecision(decision);
    setLocalMessage("");

    try {
      await applyImportIssueDecision({
        issueId: issue.id,
        decision,
        note: `Decision applied from LedgerOS frontend: ${decision}`,
      });

      setLocalMessage(
        decision === "SKIP_ROW" || decision === "REJECT"
          ? `Decision applied: ${decision}. The whole row was closed.`
          : `Decision applied: ${decision}.`,
      );
      onDecisionApplied();
    } catch (error) {
      setLocalMessage(formatDecisionError(error));
    } finally {
      setLoadingDecision(null);
    }
  }

  if (issue.status !== "OPEN") {
    return (
      <div className="mt-4 rounded-2xl border border-ledger-green/15 bg-ledger-green/10 px-4 py-3 text-sm text-ledger-green">
        This issue has already been reviewed.
      </div>
    );
  }

  return (
    <div className="mt-4 rounded-2xl border border-white/10 bg-black/20 p-4">
      <p className="text-xs uppercase tracking-[0.22em] text-ledger-muted">
        Operator decision
      </p>

      <div className="mt-3 grid gap-2 md:grid-cols-2">
        {options.map((option) => {
          const Icon = option.icon;
          const isLoading = loadingDecision === option.decision;

          return (
            <button
              key={option.decision}
              onClick={() => applyDecision(option.decision)}
              disabled={Boolean(loadingDecision)}
              className={`rounded-2xl border p-3 text-left transition disabled:opacity-60 ${option.className}`}
            >
              <div className="flex items-center gap-2">
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Icon className="h-4 w-4" />
                )}

                <span className="text-sm font-semibold">{option.label}</span>
              </div>

              <p className="mt-1 text-xs opacity-80">{option.helper}</p>
            </button>
          );
        })}
      </div>

      {localMessage ? (
        <p className="mt-3 text-xs text-ledger-muted">{localMessage}</p>
      ) : null}
    </div>
  );
}
