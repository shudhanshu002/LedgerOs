import { type LucideIcon, ArrowRight } from "lucide-react";
import clsx from "clsx";

type EmptyStateProps = {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  tone?: "green" | "blue" | "amber" | "red" | "violet";
};

const toneClasses = {
  green: "border-ledger-green/20 bg-ledger-green/10 text-ledger-green",
  blue: "border-ledger-blue/20 bg-ledger-blue/10 text-ledger-blue",
  amber: "border-ledger-amber/20 bg-ledger-amber/10 text-ledger-amber",
  red: "border-ledger-red/20 bg-ledger-red/10 text-ledger-red",
  violet: "border-ledger-violet/20 bg-ledger-violet/10 text-ledger-violet",
};

export function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
  tone = "green",
}: EmptyStateProps) {
  return (
    <div className="glass-panel ring-gradient rounded-[2rem] p-8 text-center">
      <div
        className={clsx(
          "mx-auto flex h-16 w-16 items-center justify-center rounded-3xl border",
          toneClasses[tone],
        )}
      >
        <Icon className="h-7 w-7" />
      </div>

      <h2 className="mx-auto mt-6 max-w-xl font-display text-3xl font-semibold tracking-tight text-white">
        {title}
      </h2>

      <p className="mx-auto mt-3 max-w-2xl text-sm leading-7 text-ledger-muted">
        {description}
      </p>

      {actionLabel && onAction ? (
        <button
          onClick={onAction}
          className="mx-auto mt-6 flex items-center justify-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-semibold text-ledger-bg transition hover:scale-[1.01]"
        >
          {actionLabel}
          <ArrowRight className="h-4 w-4" />
        </button>
      ) : null}
    </div>
  );
}