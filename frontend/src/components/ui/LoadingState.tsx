import { Loader2, type LucideIcon } from "lucide-react";
import clsx from "clsx";

type LoadingStateProps = {
  title?: string;
  description?: string;
  icon?: LucideIcon;
  tone?: "green" | "blue" | "amber" | "red" | "violet";
};

const toneClasses = {
  green: "border-ledger-green/20 bg-ledger-green/10 text-ledger-green",
  blue: "border-ledger-blue/20 bg-ledger-blue/10 text-ledger-blue",
  amber: "border-ledger-amber/20 bg-ledger-amber/10 text-ledger-amber",
  red: "border-ledger-red/20 bg-ledger-red/10 text-ledger-red",
  violet: "border-ledger-violet/20 bg-ledger-violet/10 text-ledger-violet",
};

export function LoadingState({
  title = "Loading workspace",
  description = "Fetching latest data from the backend ledger...",
  icon: Icon,
  tone = "green",
}: LoadingStateProps) {
  return (
    <div className="glass-panel ring-gradient rounded-[2rem] p-8">
      <div className="flex flex-col items-center justify-center text-center">
        <div
          className={clsx(
            "relative flex h-16 w-16 items-center justify-center rounded-3xl border",
            toneClasses[tone],
          )}
        >
          {Icon ? (
            <Icon className="h-7 w-7" />
          ) : (
            <Loader2 className="h-7 w-7 animate-spin" />
          )}

          <span className="absolute inset-0 rounded-3xl bg-current opacity-10 blur-xl" />
        </div>

        <h2 className="mt-6 font-display text-3xl font-semibold tracking-tight text-white">
          {title}
        </h2>

        <p className="mt-3 max-w-xl text-sm leading-7 text-ledger-muted">
          {description}
        </p>
      </div>
    </div>
  );
}