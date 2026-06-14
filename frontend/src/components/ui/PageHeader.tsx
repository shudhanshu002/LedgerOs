import { type LucideIcon } from "lucide-react";
import clsx from "clsx";

type PageHeaderProps = {
  eyebrow: string;
  title: string;
  description: string;
  icon?: LucideIcon;
  badge?: string;
  badgeTone?: "green" | "blue" | "amber" | "red" | "violet" | "neutral";
  action?: React.ReactNode;
};

const badgeClasses = {
  green: "border-ledger-green/30 bg-ledger-green/10 text-ledger-green",
  blue: "border-ledger-blue/30 bg-ledger-blue/10 text-ledger-blue",
  amber: "border-ledger-amber/30 bg-ledger-amber/10 text-ledger-amber",
  red: "border-ledger-red/30 bg-ledger-red/10 text-ledger-red",
  violet: "border-ledger-violet/30 bg-ledger-violet/10 text-ledger-violet",
  neutral: "border-white/10 bg-white/5 text-ledger-muted",
};

export function PageHeader({
  eyebrow,
  title,
  description,
  icon: Icon,
  badge,
  badgeTone = "neutral",
  action,
}: PageHeaderProps) {
  return (
    <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
      <div>
        <div className="flex flex-wrap items-center gap-3">
          {Icon ? (
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-ledger-green/20 bg-ledger-green/10 text-ledger-green">
              <Icon className="h-5 w-5" />
            </div>
          ) : null}

          <p className="text-sm uppercase tracking-[0.28em] text-ledger-green">
            {eyebrow}
          </p>
        </div>

        <h1 className="mt-3 max-w-5xl font-display text-4xl font-semibold tracking-tight text-white md:text-5xl">
          {title}
        </h1>

        <p className="mt-4 max-w-3xl text-sm leading-7 text-ledger-muted md:text-base">
          {description}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        {badge ? (
          <span
            className={clsx(
              "inline-flex items-center rounded-full border px-4 py-2 text-xs font-medium",
              badgeClasses[badgeTone],
            )}
          >
            {badge}
          </span>
        ) : null}

        {action}
      </div>
    </div>
  );
}