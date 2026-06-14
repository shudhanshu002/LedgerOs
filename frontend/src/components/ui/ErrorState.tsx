import { AlertTriangle, ArrowLeft, RefreshCcw } from "lucide-react";

type ErrorStateProps = {
  title?: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  secondaryLabel?: string;
  onSecondaryAction?: () => void;
};

export function ErrorState({
  title = "Something went wrong",
  description = "The frontend could not complete this request. Check the backend server, login token, or API response.",
  actionLabel = "Try again",
  onAction,
  secondaryLabel,
  onSecondaryAction,
}: ErrorStateProps) {
  return (
    <div className="glass-panel ring-gradient rounded-[2rem] p-8">
      <div className="flex flex-col items-center justify-center text-center">
        <div className="relative flex h-16 w-16 items-center justify-center rounded-3xl border border-ledger-red/20 bg-ledger-red/10 text-ledger-red">
          <AlertTriangle className="h-7 w-7" />
          <span className="absolute inset-0 rounded-3xl bg-ledger-red opacity-10 blur-xl" />
        </div>

        <h2 className="mt-6 font-display text-3xl font-semibold tracking-tight text-white">
          {title}
        </h2>

        <p className="mt-3 max-w-xl text-sm leading-7 text-ledger-muted">
          {description}
        </p>

        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          {onAction ? (
            <button
              onClick={onAction}
              className="flex items-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-semibold text-ledger-bg transition hover:scale-[1.01]"
            >
              <RefreshCcw className="h-4 w-4" />
              {actionLabel}
            </button>
          ) : null}

          {secondaryLabel && onSecondaryAction ? (
            <button
              onClick={onSecondaryAction}
              className="flex items-center gap-2 rounded-2xl border border-white/10 px-5 py-3 text-sm font-medium text-ledger-muted transition hover:bg-white/5 hover:text-white"
            >
              <ArrowLeft className="h-4 w-4" />
              {secondaryLabel}
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}