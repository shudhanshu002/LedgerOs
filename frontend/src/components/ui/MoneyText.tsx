import clsx from "clsx";

type MoneyTextProps = {
  value: string | number;
  paise?: number;
  showSign?: boolean;
  size?: "sm" | "md" | "lg" | "xl";
  align?: "left" | "right";
};

const sizeClasses = {
  sm: "text-sm",
  md: "font-display text-xl font-semibold",
  lg: "font-display text-2xl font-semibold",
  xl: "font-display text-3xl font-semibold",
};

function getTone(paise?: number) {
  if (paise === undefined) return "text-white";
  if (paise > 0) return "text-ledger-green";
  if (paise < 0) return "text-ledger-red";
  return "text-ledger-muted";
}

function formatValue(value: string | number, paise?: number, showSign = false) {
  const numericValue =
    typeof value === "number" ? value.toFixed(2) : value;

  if (!showSign || paise === undefined || paise === 0) {
    return `₹${numericValue}`;
  }

  return `${paise > 0 ? "+" : "-"}₹${String(numericValue).replace("-", "")}`;
}

export function MoneyText({
  value,
  paise,
  showSign = false,
  size = "md",
  align = "left",
}: MoneyTextProps) {
  return (
    <p
      className={clsx(
        sizeClasses[size],
        getTone(paise),
        align === "right" && "text-right",
      )}
    >
      {formatValue(value, paise, showSign)}
    </p>
  );
}