import { type LucideIcon } from "lucide-react";
import clsx from "clsx";
import type { ReactNode } from "react";

type SectionCardTone = "green" | "blue" | "amber" | "red" | "violet" | "neutral";

type SectionCardProps = {
  title: string;
  description?: string;
  icon?: LucideIcon;
  tone?: SectionCardTone;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  headerClassName?: string;
};

const toneClasses: Record<SectionCardTone, string> = {
  green: "border-ledger-green/20 bg-ledger-green/10 text-ledger-green",
  blue: "border-ledger-blue/20 bg-ledger-blue/10 text-ledger-blue",
  amber: "border-ledger-amber/20 bg-ledger-amber/10 text-ledger-amber",
  red: "border-ledger-red/20 bg-ledger-red/10 text-ledger-red",
  violet: "border-ledger-violet/20 bg-ledger-violet/10 text-ledger-violet",
  neutral: "border-white/10 bg-white/[0.04] text-ledger-muted",
};

export function SectionCard({
  title,
  description,
  icon: Icon,
  tone = "green",
  action,
  children,
  className,
  headerClassName,
}: SectionCardProps) {
  return (
    <section className={clsx("glass-panel rounded-3xl p-6", className)}>
      <div
        className={clsx(
          "flex flex-col justify-between gap-4 md:flex-row md:items-start",
          headerClassName,
        )}
      >
        <div className="flex items-start gap-3">
          {Icon ? (
            <div
              className={clsx(
                "rounded-2xl border p-3",
                toneClasses[tone],
              )}
            >
              <Icon className="h-5 w-5" />
            </div>
          ) : null}

          <div>
            <h2 className="font-display text-2xl font-semibold text-white">
              {title}
            </h2>

            {description ? (
              <p className="mt-1 max-w-3xl text-sm leading-6 text-ledger-muted">
                {description}
              </p>
            ) : null}
          </div>
        </div>

        {action ? <div className="shrink-0">{action}</div> : null}
      </div>

      <div className="mt-6">{children}</div>
    </section>
  );
}