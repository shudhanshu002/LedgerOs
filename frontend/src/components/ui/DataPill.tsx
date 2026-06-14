import { type LucideIcon } from "lucide-react";
import clsx from "clsx";

type DataPillTone =
  | "green"
  | "blue"
  | "amber"
  | "red"
  | "violet"
  | "neutral";

type DataPillProps = {
  label: string;
  value?: string | number;
  icon?: LucideIcon;
  tone?: DataPillTone;
  compact?: boolean;
};

const toneClasses: Record<DataPillTone, string> = {
  green: "border-ledger-green/20 bg-ledger-green/10 text-ledger-green",
  blue: "border-ledger-blue/20 bg-ledger-blue/10 text-ledger-blue",
  amber: "border-ledger-amber/20 bg-ledger-amber/10 text-ledger-amber",
  red: "border-ledger-red/20 bg-ledger-red/10 text-ledger-red",
  violet: "border-ledger-violet/20 bg-ledger-violet/10 text-ledger-violet",
  neutral: "border-white/10 bg-white/[0.04] text-ledger-muted",
};

export function DataPill({
  label,
  value,
  icon: Icon,
  tone = "neutral",
  compact = false,
}: DataPillProps) {
  return (
    <div
      className={clsx(
        "inline-flex items-center gap-2 rounded-full border font-medium",
        toneClasses[tone],
        compact ? "px-3 py-1 text-xs" : "px-4 py-2 text-sm",
      )}
    >
      {Icon ? <Icon className={compact ? "h-3.5 w-3.5" : "h-4 w-4"} /> : null}

      <span>{label}</span>

      {value !== undefined ? (
        <span className="rounded-full bg-black/20 px-2 py-0.5 text-white">
          {value}
        </span>
      ) : null}
    </div>
  );
}