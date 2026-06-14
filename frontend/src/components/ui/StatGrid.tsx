import { type LucideIcon } from "lucide-react";
import clsx from "clsx";

type StatGridTone =
  | "green"
  | "blue"
  | "amber"
  | "red"
  | "violet"
  | "neutral";

type StatItem = {
  label: string;
  value: string | number;
  helper?: string;
  icon?: LucideIcon;
  tone?: StatGridTone;
};

type StatGridProps = {
  items: StatItem[];
  columns?: 2 | 3 | 4;
};

const toneClasses: Record<StatGridTone, string> = {
  green: "border-ledger-green/20 bg-ledger-green/10 text-ledger-green",
  blue: "border-ledger-blue/20 bg-ledger-blue/10 text-ledger-blue",
  amber: "border-ledger-amber/20 bg-ledger-amber/10 text-ledger-amber",
  red: "border-ledger-red/20 bg-ledger-red/10 text-ledger-red",
  violet: "border-ledger-violet/20 bg-ledger-violet/10 text-ledger-violet",
  neutral: "border-white/10 bg-white/[0.04] text-ledger-muted",
};

const columnClasses = {
  2: "md:grid-cols-2",
  3: "md:grid-cols-3",
  4: "md:grid-cols-2 xl:grid-cols-4",
};

export function StatGrid({ items, columns = 4 }: StatGridProps) {
  return (
    <div className={clsx("grid gap-4", columnClasses[columns])}>
      {items.map((item) => {
        const Icon = item.icon;
        const tone = item.tone ?? "neutral";

        return (
          <div
            key={item.label}
            className="rounded-3xl border border-white/10 bg-white/[0.03] p-5 transition hover:border-ledger-green/20 hover:bg-white/[0.05]"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm text-ledger-muted">{item.label}</p>

                <p className="mt-2 font-display text-3xl font-semibold tracking-tight text-white">
                  {item.value}
                </p>

                {item.helper ? (
                  <p className="mt-2 text-xs leading-5 text-ledger-muted">
                    {item.helper}
                  </p>
                ) : null}
              </div>

              {Icon ? (
                <div className={clsx("rounded-2xl border p-3", toneClasses[tone])}>
                  <Icon className="h-5 w-5" />
                </div>
              ) : null}
            </div>
          </div>
        );
      })}
    </div>
  );
}