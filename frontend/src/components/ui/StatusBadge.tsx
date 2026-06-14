import clsx from "clsx";

type StatusBadgeProps = {
  children: string;
  tone?: "green" | "blue" | "amber" | "red" | "violet" | "neutral";
};

const toneClasses = {
  green: "border-ledger-green/30 bg-ledger-green/10 text-ledger-green",
  blue: "border-ledger-blue/30 bg-ledger-blue/10 text-ledger-blue",
  amber: "border-ledger-amber/30 bg-ledger-amber/10 text-ledger-amber",
  red: "border-ledger-red/30 bg-ledger-red/10 text-ledger-red",
  violet: "border-ledger-violet/30 bg-ledger-violet/10 text-ledger-violet",
  neutral: "border-white/10 bg-white/5 text-ledger-muted",
};

export function StatusBadge({
  children,
  tone = "neutral",
}: StatusBadgeProps) {
  return (
    <span
      className={clsx(
        "inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium",
        toneClasses[tone],
      )}
    >
      {children}
    </span>
  );
}