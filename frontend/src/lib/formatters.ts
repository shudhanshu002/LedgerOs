export function formatDate(value: string | null | undefined) {
  if (!value) return "N/A";

  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

export function formatDateTime(value: string | null | undefined) {
  if (!value) return "N/A";

  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function formatMoney(value: string | number) {
  const numericValue =
    typeof value === "number" ? value.toFixed(2) : value;

  return `₹${numericValue}`;
}

export function formatPaiseToRupees(paise: number) {
  return `₹${(paise / 100).toFixed(2)}`;
}

export function formatSignedMoneyFromPaise(paise: number) {
  const absoluteValue = Math.abs(paise);
  const formatted = `₹${(absoluteValue / 100).toFixed(2)}`;

  if (paise > 0) return `+${formatted}`;
  if (paise < 0) return `-${formatted}`;

  return formatted;
}

export function formatNumber(value: number) {
  return new Intl.NumberFormat("en-IN").format(value);
}

export function formatIssueCode(code: string) {
  return code
    .toLowerCase()
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export function formatStatus(status: string) {
  return status
    .toLowerCase()
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export function getBalanceLabel(balancePaise: number) {
  if (balancePaise > 0) return "Gets back";
  if (balancePaise < 0) return "Owes";
  return "Settled";
}

export function getBalanceTone(balancePaise: number) {
  if (balancePaise > 0) return "green";
  if (balancePaise < 0) return "red";
  return "neutral";
}

export function getImportStatusTone(status?: string) {
  if (status === "COMMITTED") return "green";
  if (status === "PARTIALLY_COMMITTED") return "amber";
  if (status === "PENDING_REVIEW") return "violet";
  if (status === "FAILED") return "red";
  return "neutral";
}

export function getSeverityTone(severity?: string) {
  if (severity === "ERROR") return "red";
  if (severity === "WARNING") return "amber";
  if (severity === "INFO") return "blue";
  return "neutral";
}

export function getActionTone(action: string) {
  if (action.includes("UPLOAD")) return "blue";
  if (action.includes("REVIEW")) return "violet";
  if (action.includes("COMMIT")) return "green";
  if (action.includes("DELETE") || action.includes("REMOVE")) return "red";
  return "neutral";
}

export function truncateText(value: string, maxLength = 80) {
  if (value.length <= maxLength) return value;

  return `${value.slice(0, maxLength)}...`;
}