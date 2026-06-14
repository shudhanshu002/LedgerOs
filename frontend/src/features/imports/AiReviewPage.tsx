import { useEffect, useState } from "react";
import {
  AlertTriangle,
  BrainCircuit,
  CheckCircle2,
  FileWarning,
  Lightbulb,
  RefreshCcw,
  ShieldAlert,
  Sparkles,
} from "lucide-react";
import { usePageTitle } from "../../hooks/usePageTitle";
import { LoadingState } from "../../components/ui/LoadingState";
import { MetricCard } from "../../components/ui/MetricCard";
import { StatusBadge } from "../../components/ui/StatusBadge";
import { resolveActiveGroupId } from "../../lib/activeGroup";
import { getGroups } from "../groups/groupsApi";
import { getImportAiExplanation, getImportBatches } from "./importsApi";
import type { AiImportExplanation, AiIssueExplanation } from "./types";

function getSeverityTone(severity: AiIssueExplanation["severity"]) {
  if (severity === "ERROR") return "red";
  if (severity === "WARNING") return "amber";
  return "blue";
}

function getSeverityIcon(severity: AiIssueExplanation["severity"]) {
  if (severity === "ERROR") return ShieldAlert;
  if (severity === "WARNING") return AlertTriangle;
  return Lightbulb;
}

export function AiReviewPage() {
  usePageTitle("AI Review");

  const [report, setReport] = useState<AiImportExplanation | null>(null);
  const [loading, setLoading] = useState(true);

  async function loadReport() {
    setLoading(true);

    try {
      const [groups, batches] = await Promise.all([
        getGroups(),
        getImportBatches(),
      ]);
      const activeGroupId = resolveActiveGroupId(groups);
      const batch = batches.find((item) => item.group === activeGroupId);

      if (!batch) {
        setReport(null);
        return;
      }

      const data = await getImportAiExplanation(batch.id);
      setReport(data);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadReport().catch(console.error);
  }, []);

  if (loading) {
    return (
      <section className="py-8">
        <LoadingState
          title="Loading AI review"
          description="Fetching the latest import batch and deterministic anomaly explanations."
          icon={BrainCircuit}
          tone="violet"
        />
      </section>
    );
  }

  if (!report) {
    return (
      <section className="py-8">
        <div className="glass-panel rounded-3xl p-8 text-ledger-muted">
          No AI report available. Upload a CSV first.
        </div>
      </section>
    );
  }

  return (
    <section className="py-8">
      <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-ledger-violet/20 bg-ledger-violet/10 px-4 py-2 text-sm text-ledger-violet">
            <Sparkles className="h-4 w-4" />
            Deterministic AI-style anomaly explanation
          </div>

          <h1 className="mt-4 font-display text-5xl font-semibold tracking-tight">
            Explain the risk before approving money.
          </h1>

          <p className="mt-4 max-w-3xl text-ledger-muted">
            This screen converts raw import issues into human-readable financial
            review guidance: what happened, why it matters, and what action the
            operator should take.
          </p>
        </div>

        <button
          onClick={() => loadReport().catch(console.error)}
          className="flex items-center gap-2 rounded-2xl border border-white/10 px-4 py-3 text-sm text-ledger-muted transition hover:bg-white/5 hover:text-white"
        >
          <RefreshCcw className="h-4 w-4" />
          Refresh report
        </button>
      </div>

      <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Total rows"
          value={report.total_rows}
          helper={report.display_filename ?? report.filename}
          icon={FileWarning}
          tone="blue"
        />

        <MetricCard
          label="Total issues"
          value={report.total_issues}
          helper={`${report.open_issue_count} still open`}
          icon={BrainCircuit}
          tone="violet"
        />

        <MetricCard
          label="Open errors"
          value={report.open_severity_counts.error}
          helper={`${report.severity_counts.error} detected total`}
          icon={ShieldAlert}
          tone="red"
        />

        <MetricCard
          label="Open warnings"
          value={report.open_severity_counts.warning}
          helper={`${report.severity_counts.warning} detected total`}
          icon={AlertTriangle}
          tone="amber"
        />
      </div>

      <div className="mt-8 grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <div className="space-y-6">
          <div className="glass-panel ring-gradient rounded-3xl p-6">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl border border-ledger-violet/20 bg-ledger-violet/10 p-3 text-ledger-violet">
                <BrainCircuit className="h-5 w-5" />
              </div>

              <div>
                <h2 className="font-display text-2xl font-semibold">
                  Executive import summary
                </h2>
                <p className="text-sm text-ledger-muted">
                  Batch #{report.batch_id} - {report.batch_status}
                </p>
              </div>
            </div>

            <p className="mt-6 text-lg leading-8 text-white">
              {report.summary}
            </p>
          </div>

          <div className="glass-panel rounded-3xl p-6">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="h-5 w-5 text-ledger-green" />
              <h2 className="font-display text-2xl font-semibold">
                Commit guidance
              </h2>
            </div>

            <div className="mt-5 space-y-3">
              {report.commit_guidance.map((guidance) => (
                <div
                  key={guidance}
                  className="rounded-3xl border border-white/10 bg-white/[0.03] p-5"
                >
                  <p className="leading-7 text-ledger-muted">{guidance}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="glass-panel rounded-3xl p-6">
            <p className="text-xs uppercase tracking-[0.24em] text-ledger-muted">
              Design note
            </p>

            <p className="mt-3 leading-7 text-ledger-muted">
              This AI review is deterministic. It does not depend on an external
              LLM API, so the demo stays reliable while still giving the user
              explainable anomaly guidance.
            </p>
          </div>

          <div className="glass-panel rounded-3xl p-6">
            <p className="text-xs uppercase tracking-[0.24em] text-ledger-muted">
              Current row state
            </p>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <StatusBadge tone="green">
                {`Committed ${report.row_counts.committed_rows}`}
              </StatusBadge>
              <StatusBadge tone="green">
                {`Valid ${report.row_counts.valid_rows}`}
              </StatusBadge>
              <StatusBadge tone="amber">
                {`Review ${report.row_counts.needs_review_rows}`}
              </StatusBadge>
              <StatusBadge tone="red">
                {`Blocked ${report.row_counts.blocked_rows}`}
              </StatusBadge>
            </div>
          </div>
        </div>

        <div className="glass-panel rounded-3xl p-6">
          <div className="flex items-center gap-3">
            <FileWarning className="h-5 w-5 text-ledger-amber" />
            <h2 className="font-display text-2xl font-semibold">
              Issue intelligence
            </h2>
          </div>

          <div className="mt-6 max-h-[840px] space-y-4 overflow-y-auto pr-1">
            {report.issue_explanations.map((issue) => {
              const Icon = getSeverityIcon(issue.severity);

              return (
                <article
                  key={issue.code}
                  className="rounded-[1.7rem] border border-white/10 bg-white/[0.03] p-5 transition hover:border-ledger-violet/20 hover:bg-white/[0.05]"
                >
                  <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
                    <div className="flex items-start gap-3">
                      <div className="rounded-2xl border border-white/10 bg-black/20 p-3">
                        <Icon className="h-5 w-5 text-ledger-violet" />
                      </div>

                      <div>
                        <h3 className="font-display text-xl font-semibold">
                          {issue.code}
                        </h3>

                        <p className="mt-1 text-sm text-ledger-muted">
                          {issue.count} occurrence
                          {issue.count === 1 ? "" : "s"}
                          {issue.open_count > 0
                            ? ` - ${issue.open_count} open`
                            : " - none open"}
                        </p>
                      </div>
                    </div>

                    <StatusBadge tone={getSeverityTone(issue.severity)}>
                      {issue.severity}
                    </StatusBadge>
                  </div>

                  <div className="mt-5 grid gap-3">
                    <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                      <p className="text-xs uppercase tracking-[0.2em] text-ledger-muted">
                        Meaning
                      </p>
                      <p className="mt-2 leading-6">{issue.meaning}</p>
                    </div>

                    <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                      <p className="text-xs uppercase tracking-[0.2em] text-ledger-muted">
                        Risk
                      </p>
                      <p className="mt-2 leading-6 text-ledger-muted">
                        {issue.risk}
                      </p>
                    </div>

                    <div className="rounded-2xl border border-ledger-green/15 bg-ledger-green/10 p-4">
                      <p className="text-xs uppercase tracking-[0.2em] text-ledger-green">
                        Recommended action
                      </p>
                      <p className="mt-2 leading-6 text-white">
                        {issue.recommended_action}
                      </p>
                    </div>
                  </div>

                  {issue.samples.length ? (
                    <div className="mt-5">
                      <p className="text-xs uppercase tracking-[0.2em] text-ledger-muted">
                        Sample affected rows
                      </p>

                      <div className="mt-3 space-y-2">
                        {issue.samples.map((sample) => (
                          <div
                            key={`${issue.code}-${sample.row_number}-${sample.message}`}
                            className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3"
                          >
                            <p className="text-sm text-white">
                              Row {sample.row_number ?? "N/A"} - {sample.status}
                            </p>

                            <p className="mt-1 text-xs leading-5 text-ledger-muted">
                              {sample.message}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </article>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
