import {
  AlertTriangle,
  DatabaseZap,
  GitCommitHorizontal,
  LockKeyhole,
  ShieldCheck,
  UploadCloud,
} from "lucide-react";
import { StatusBadge } from "../../components/ui/StatusBadge";

type ImportPolicyStripProps = {
  batchStatus?: string;
  totalRows?: number;
  issueCount?: number;
  loading?: boolean;
};

function getStatusTone(status?: string) {
  if (status === "COMMITTED") return "green";
  if (status === "PARTIALLY_COMMITTED") return "amber";
  if (status === "PENDING_REVIEW") return "violet";
  if (status === "FAILED") return "red";
  return "neutral";
}

const policies = [
  {
    title: "Upload is non-destructive",
    description:
      "CSV upload creates an import batch only. It never writes directly into expenses.",
    icon: UploadCloud,
    tone: "border-ledger-blue/20 bg-ledger-blue/10 text-ledger-blue",
  },
  {
    title: "Anomalies block unsafe money",
    description:
      "Invalid dates, unknown members, bad percentages, and missing values are stopped before commit.",
    icon: AlertTriangle,
    tone: "border-ledger-amber/20 bg-ledger-amber/10 text-ledger-amber",
  },
  {
    title: "Commit safe rows only",
    description:
      "Only valid or reviewed rows are converted into real ledger records.",
    icon: GitCommitHorizontal,
    tone: "border-ledger-green/20 bg-ledger-green/10 text-ledger-green",
  },
  {
    title: "Audit evidence is preserved",
    description:
      "Upload, review decisions, and commit actions are recorded for traceability.",
    icon: LockKeyhole,
    tone: "border-ledger-violet/20 bg-ledger-violet/10 text-ledger-violet",
  },
];

export function ImportPolicyStrip({
  batchStatus,
  totalRows = 0,
  issueCount = 0,
  loading = false,
}: ImportPolicyStripProps) {
  return (
    <div className="glass-panel ring-gradient rounded-[2rem] p-6">
      <div className="flex flex-col justify-between gap-5 xl:flex-row xl:items-center">
        <div className="flex items-start gap-3">
          <div className="rounded-2xl border border-ledger-green/20 bg-ledger-green/10 p-3 text-ledger-green">
            <ShieldCheck className="h-5 w-5" />
          </div>

          <div>
            <h2 className="font-display text-2xl font-semibold">
              Import governance policy
            </h2>

            <p className="mt-2 max-w-3xl text-sm leading-6 text-ledger-muted">
              This screen follows the backend safety contract: parse first,
              detect anomalies second, review risk third, and commit only safe
              financial movements.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge tone={getStatusTone(batchStatus)}>
            {loading ? "LOADING_BATCH" : batchStatus ?? "NO_BATCH_SELECTED"}
          </StatusBadge>

          <StatusBadge tone="blue">
            {loading ? "Loading rows" : `${totalRows} rows`}
          </StatusBadge>

          <StatusBadge tone={issueCount > 0 ? "amber" : "green"}>
            {loading ? "Loading issues" : `${issueCount} issues`}
          </StatusBadge>
        </div>
      </div>

      <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {policies.map((policy) => {
          const Icon = policy.icon;

          return (
            <div
              key={policy.title}
              className="rounded-3xl border border-white/10 bg-white/[0.03] p-5 transition hover:border-ledger-green/20 hover:bg-white/[0.05]"
            >
              <div
                className={`flex h-12 w-12 items-center justify-center rounded-2xl border ${policy.tone}`}
              >
                <Icon className="h-5 w-5" />
              </div>

              <p className="mt-4 font-display text-lg font-semibold">
                {policy.title}
              </p>

              <p className="mt-2 text-sm leading-6 text-ledger-muted">
                {policy.description}
              </p>
            </div>
          );
        })}
      </div>

      <div className="mt-6 rounded-3xl border border-white/10 bg-black/20 p-5">
        <div className="flex items-start gap-3">
          <DatabaseZap className="mt-1 h-5 w-5 text-ledger-green" />

          <p className="text-sm leading-7 text-ledger-muted">
            The frontend is intentionally aligned with the relational backend:
            import batches, import rows, import issues, expenses, settlements,
            and audit logs stay separate so every financial decision remains
            explainable.
          </p>
        </div>
      </div>
    </div>
  );
}
