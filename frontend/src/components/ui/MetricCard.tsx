import type { LucideIcon } from "lucide-react";
import clsx from "clsx";

type Tone = "green" | "blue" | "amber" | "red" | "violet";

type MetricCardProps = {
  label: string;
  value: string | number;
  helper?: string;
  icon: LucideIcon;
  tone?: Tone;
};

const toneClasses: Record<Tone, string> = {
  green: "text-ledger-green bg-ledger-green/10 border-ledger-green/20",
  blue: "text-ledger-blue bg-ledger-blue/10 border-ledger-blue/20",
  amber: "text-ledger-amber bg-ledger-amber/10 border-ledger-amber/20",
  red: "text-ledger-red bg-ledger-red/10 border-ledger-red/20",
  violet: "text-ledger-violet bg-ledger-violet/10 border-ledger-violet/20",
};

export function MetricCard({
  label,
  value,
  helper,
  icon: Icon,
  tone = "green",
}: MetricCardProps) {
  return (
    <div className="glass-panel ring-gradient rounded-3xl p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm text-ledger-muted">{label}</p>
          <p className="mt-2 font-display text-3xl font-semibold tracking-tight text-white">
            {value}
          </p>
          {helper ? (
            <p className="mt-2 text-xs leading-5 text-ledger-muted">
              {helper}
            </p>
          ) : null}
        </div>

        <div className={clsx("rounded-2xl border p-3", toneClasses[tone])}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}