import { Radar, TrendingDown, TrendingUp } from "lucide-react";
import { type BalanceLine } from "./types";
import { StatusBadge } from "../../components/ui/StatusBadge";

type BalanceRadarProps = {
  balances: BalanceLine[];
};

function getInitial(name: string) {
  return name.charAt(0).toUpperCase();
}

function getAbsoluteMax(balances: BalanceLine[]) {
  const max = Math.max(
    ...balances.map((line) => Math.abs(line.balance_paise)),
    1,
  );

  return max;
}

function getPosition(
  index: number,
  total: number,
  value: number,
  maxValue: number,
) {
  const centerX = 260;
  const centerY = 190;
  const maxRadius = 125;

  const ratio = Math.abs(value) / maxValue;
  const radius = 42 + ratio * maxRadius;
  const angle = (index / total) * Math.PI * 2 - Math.PI / 2;

  return {
    x: centerX + Math.cos(angle) * radius,
    y: centerY + Math.sin(angle) * radius,
  };
}

function getTone(balancePaise: number) {
  if (balancePaise > 0) {
    return {
      label: "Gets back",
      textClass: "text-ledger-green",
      borderClass: "border-ledger-green/30",
      bgClass: "bg-ledger-green/10",
      fill: "rgb(48 226 155 / 0.18)",
      stroke: "rgb(48 226 155 / 0.55)",
    };
  }

  if (balancePaise < 0) {
    return {
      label: "Owes",
      textClass: "text-ledger-red",
      borderClass: "border-ledger-red/30",
      bgClass: "bg-ledger-red/10",
      fill: "rgb(255 92 122 / 0.16)",
      stroke: "rgb(255 92 122 / 0.55)",
    };
  }

  return {
    label: "Settled",
    textClass: "text-ledger-muted",
    borderClass: "border-white/10",
    bgClass: "bg-white/[0.04]",
    fill: "rgb(148 163 184 / 0.12)",
    stroke: "rgb(148 163 184 / 0.35)",
  };
}

export function BalanceRadar({ balances }: BalanceRadarProps) {
  const maxValue = getAbsoluteMax(balances);

  const creditors = balances.filter((line) => line.balance_paise > 0);
  const debtors = balances.filter((line) => line.balance_paise < 0);

  return (
    <div className="glass-panel ring-gradient rounded-[2rem] p-6">
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
        <div>
          <div className="flex items-center gap-3">
            <div className="rounded-2xl border border-ledger-violet/20 bg-ledger-violet/10 p-3 text-ledger-violet">
              <Radar className="h-5 w-5" />
            </div>

            <div>
              <h2 className="font-display text-2xl font-semibold">
                Balance exposure radar
              </h2>
              <p className="text-sm text-ledger-muted">
                A visual map of who is farthest from zero.
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge tone="green">
            {`${creditors.length} creditor${creditors.length === 1 ? "" : "s"}`}
          </StatusBadge>

          <StatusBadge tone="red">
            {`${debtors.length} debtor${debtors.length === 1 ? "" : "s"}`}
          </StatusBadge>
        </div>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="overflow-hidden rounded-3xl border border-white/10 bg-black/20">
          <svg
            viewBox="0 0 520 380"
            role="img"
            aria-label="Balance exposure radar"
            className="h-[380px] w-full"
          >
            <defs>
              <filter id="balance-node-glow">
                <feGaussianBlur stdDeviation="4" result="coloredBlur" />
                <feMerge>
                  <feMergeNode in="coloredBlur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            <rect width="520" height="380" fill="transparent" />

            {[46, 86, 126, 166].map((radius) => (
              <circle
                key={radius}
                cx="260"
                cy="190"
                r={radius}
                fill="none"
                stroke="rgb(255 255 255 / 0.08)"
                strokeWidth="1"
              />
            ))}

            <line
              x1="260"
              y1="24"
              x2="260"
              y2="356"
              stroke="rgb(255 255 255 / 0.07)"
              strokeWidth="1"
            />

            <line
              x1="72"
              y1="190"
              x2="448"
              y2="190"
              stroke="rgb(255 255 255 / 0.07)"
              strokeWidth="1"
            />

            <circle
              cx="260"
              cy="190"
              r="34"
              fill="rgb(255 255 255 / 0.06)"
              stroke="rgb(255 255 255 / 0.12)"
            />

            <text
              x="260"
              y="185"
              textAnchor="middle"
              fill="#f8fafc"
              fontSize="13"
              fontWeight="700"
            >
              Zero
            </text>

            <text
              x="260"
              y="204"
              textAnchor="middle"
              fill="#94a3b8"
              fontSize="11"
            >
              settled
            </text>

            {balances.map((line, index) => {
              const point = getPosition(
                index,
                balances.length,
                line.balance_paise,
                maxValue,
              );

              const tone = getTone(line.balance_paise);

              return (
                <g key={line.person} filter="url(#balance-node-glow)">
                  <line
                    x1="260"
                    y1="190"
                    x2={point.x}
                    y2={point.y}
                    stroke={tone.stroke}
                    strokeWidth="1.5"
                    strokeDasharray="6 6"
                  />

                  <circle
                    cx={point.x}
                    cy={point.y}
                    r="30"
                    fill={tone.fill}
                    stroke={tone.stroke}
                    strokeWidth="1.5"
                  />

                  <text
                    x={point.x}
                    y={point.y + 6}
                    textAnchor="middle"
                    fill="#f8fafc"
                    fontSize="18"
                    fontWeight="700"
                  >
                    {getInitial(line.person)}
                  </text>

                  <text
                    x={point.x}
                    y={point.y + 48}
                    textAnchor="middle"
                    fill="#94a3b8"
                    fontSize="12"
                  >
                    {line.person}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>

        <div className="space-y-3">
          {balances.map((line) => {
            const tone = getTone(line.balance_paise);
            const width = Math.max(
              8,
              Math.round((Math.abs(line.balance_paise) / maxValue) * 100),
            );

            return (
              <div
                key={line.person}
                className="rounded-3xl border border-white/10 bg-white/[0.03] p-5"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-display text-xl font-semibold">
                      {line.person}
                    </p>

                    <p className={`mt-1 text-sm ${tone.textClass}`}>
                      {tone.label}
                    </p>
                  </div>

                  <p className={`font-display text-2xl font-semibold ${tone.textClass}`}>
                    ₹{line.balance_rupees}
                  </p>
                </div>

                <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/10">
                  <div
                    className={`h-full rounded-full ${tone.bgClass}`}
                    style={{ width: `${width}%` }}
                  />
                </div>

                <div className="mt-3 flex items-center gap-2 text-xs text-ledger-muted">
                  {line.balance_paise > 0 ? (
                    <TrendingUp className="h-3.5 w-3.5 text-ledger-green" />
                  ) : (
                    <TrendingDown className="h-3.5 w-3.5 text-ledger-red" />
                  )}

                  <span>
                    Exposure: {Math.abs(line.balance_paise)} paise from zero
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
