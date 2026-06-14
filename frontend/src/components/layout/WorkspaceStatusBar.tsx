import { useLocation } from "react-router-dom";
import {
  Activity,
  Database,
  Route,
  Server,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { useActiveWorkspaceName } from "../../hooks/useActiveWorkspaceName";
import { StatusBadge } from "../ui/StatusBadge";

const pageMeta: Record<string, { label: string; context: string }> = {
  "/dashboard": {
    label: "Command Center",
    context: "System overview",
  },
  "/groups": {
    label: "Groups",
    context: "Membership validation",
  },
  "/imports": {
    label: "Import Cockpit",
    context: "CSV anomaly review",
  },
  "/expenses": {
    label: "Expenses",
    context: "Committed ledger rows",
  },
  "/ai-review": {
    label: "AI Review",
    context: "Explainable import risk",
  },
  "/balances": {
    label: "Balances",
    context: "Ledger settlement engine",
  },
  "/audit": {
    label: "Audit Trail",
    context: "Financial evidence stream",
  },
};

function getCurrentTime() {
  return new Intl.DateTimeFormat("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "short",
  }).format(new Date());
}

export function WorkspaceStatusBar() {
  const location = useLocation();
  const workspaceName = useActiveWorkspaceName();

  const currentPage = pageMeta[location.pathname] ?? {
    label: "LedgerOS",
    context: "Shared expense intelligence",
  };

  const apiBaseUrl =
    import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000";

  return (
    <div className="mb-6 hidden rounded-[1.7rem] border border-white/10 bg-white/[0.03] px-5 py-4 backdrop-blur-xl lg:block">
      <div className="flex flex-col justify-between gap-4 xl:flex-row xl:items-center">
        <div className="flex items-center gap-4">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-ledger-green/20 bg-ledger-green/10 text-ledger-green">
            <Activity className="h-5 w-5" />
          </div>

          <div>
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-display text-lg font-semibold text-white">
                {currentPage.label}
              </p>

              <StatusBadge tone="green">Live workspace</StatusBadge>
            </div>

            <p className="mt-1 text-sm text-ledger-muted">
              {currentPage.context} - {workspaceName} - {getCurrentTime()}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex items-center gap-2 rounded-full border border-ledger-blue/20 bg-ledger-blue/10 px-3 py-2 text-xs text-ledger-blue">
            <Server className="h-3.5 w-3.5" />
            Django REST
          </div>

          <div className="inline-flex items-center gap-2 rounded-full border border-ledger-green/20 bg-ledger-green/10 px-3 py-2 text-xs text-ledger-green">
            <Database className="h-3.5 w-3.5" />
            Relational DB
          </div>

          <div className="inline-flex items-center gap-2 rounded-full border border-ledger-violet/20 bg-ledger-violet/10 px-3 py-2 text-xs text-ledger-violet">
            <Sparkles className="h-3.5 w-3.5" />
            AI Review Layer
          </div>

          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/20 px-3 py-2 text-xs text-ledger-muted">
            <Route className="h-3.5 w-3.5" />
            {apiBaseUrl}
          </div>

          <div className="inline-flex items-center gap-2 rounded-full border border-ledger-green/20 bg-ledger-green/10 px-3 py-2 text-xs text-ledger-green">
            <ShieldCheck className="h-3.5 w-3.5" />
            JWT protected
          </div>
        </div>
      </div>
    </div>
  );
}
