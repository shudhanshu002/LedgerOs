export type {
  BalanceLine,
  SuggestedSettlement,
  GroupBalances,
} from "../../types/api";

export type BalanceTone = "green" | "red" | "neutral";

export type BreakdownItem = {
  type?: string;
  expense_id?: number;
  settlement_id?: number;
  date?: string;
  description?: string;
  amount_paise?: number;
  explanation?: string;
};

export type BalanceTotals = {
  totalPositive: number;
  totalNegative: number;
  creditors: number;
  debtors: number;
  settled: number;
};

export function formatMoney(value: string | number) {
  return `₹${value}`;
}

export function formatPaise(paise: number) {
  return `₹${(paise / 100).toFixed(2)}`;
}

export function formatSignedPaise(paise: number) {
  const absoluteValue = Math.abs(paise);
  const formattedValue = `₹${(absoluteValue / 100).toFixed(2)}`;

  if (paise > 0) return `+${formattedValue}`;
  if (paise < 0) return `-${formattedValue}`;

  return formattedValue;
}

export function getBalanceLabel(balancePaise: number) {
  if (balancePaise > 0) return "Gets back";
  if (balancePaise < 0) return "Owes";
  return "Settled";
}

export function getBalanceTone(balancePaise: number): BalanceTone {
  if (balancePaise > 0) return "green";
  if (balancePaise < 0) return "red";
  return "neutral";
}

export function getBalanceTextClass(balancePaise: number) {
  if (balancePaise > 0) return "text-ledger-green";
  if (balancePaise < 0) return "text-ledger-red";
  return "text-ledger-muted";
}

export function calculateBalanceTotals(
  balances: { balance_paise: number }[],
): BalanceTotals {
  return balances.reduce<BalanceTotals>(
    (totals, line) => {
      if (line.balance_paise > 0) {
        totals.totalPositive += line.balance_paise;
        totals.creditors += 1;
      } else if (line.balance_paise < 0) {
        totals.totalNegative += Math.abs(line.balance_paise);
        totals.debtors += 1;
      } else {
        totals.settled += 1;
      }

      return totals;
    },
    {
      totalPositive: 0,
      totalNegative: 0,
      creditors: 0,
      debtors: 0,
      settled: 0,
    },
  );
}

export function getLargestExposure(
  balances: { person: string; balance_paise: number }[],
) {
  if (!balances.length) return null;

  return balances.reduce((largest, current) => {
    return Math.abs(current.balance_paise) > Math.abs(largest.balance_paise)
      ? current
      : largest;
  }, balances[0]);
}
