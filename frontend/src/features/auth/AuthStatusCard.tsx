import {
  Database,
  Fingerprint,
  KeyRound,
  LockKeyhole,
  ShieldCheck,
  UserRoundCheck,
} from "lucide-react";

const authPoints = [
  {
    title: "JWT session",
    description: "Frontend stores access and refresh tokens after login.",
    icon: KeyRound,
    tone: "border-ledger-green/20 bg-ledger-green/10 text-ledger-green",
  },
  {
    title: "Demo admin",
    description: "Aisha can upload, review, and commit import batches.",
    icon: UserRoundCheck,
    tone: "border-ledger-blue/20 bg-ledger-blue/10 text-ledger-blue",
  },
  {
    title: "Protected APIs",
    description: "Every dashboard request uses Authorization: Bearer token.",
    icon: LockKeyhole,
    tone: "border-ledger-violet/20 bg-ledger-violet/10 text-ledger-violet",
  },
];

export function AuthStatusCard() {
  return (
    <div className="mt-6 rounded-[1.7rem] border border-white/10 bg-white/[0.03] p-5">
      <div className="flex items-start gap-3">
        <div className="rounded-2xl border border-ledger-green/20 bg-ledger-green/10 p-3 text-ledger-green">
          <Fingerprint className="h-5 w-5" />
        </div>

        <div>
          <p className="font-display text-lg font-semibold">
            Authentication contract
          </p>

          <p className="mt-2 text-sm leading-6 text-ledger-muted">
            This login screen is wired to the Django REST JWT endpoint, not a
            fake frontend-only login.
          </p>
        </div>
      </div>

      <div className="mt-5 grid gap-3">
        {authPoints.map((point) => {
          const Icon = point.icon;

          return (
            <div
              key={point.title}
              className="rounded-2xl border border-white/10 bg-black/20 p-4"
            >
              <div className="flex items-start gap-3">
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-xl border ${point.tone}`}
                >
                  <Icon className="h-4 w-4" />
                </div>

                <div>
                  <p className="text-sm font-semibold text-white">
                    {point.title}
                  </p>

                  <p className="mt-1 text-xs leading-5 text-ledger-muted">
                    {point.description}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-5 rounded-2xl border border-ledger-green/20 bg-ledger-green/10 p-4">
        <div className="flex items-start gap-3">
          <ShieldCheck className="mt-0.5 h-4 w-4 text-ledger-green" />

          <p className="text-xs leading-5 text-ledger-muted">
            Demo credentials are prefilled:{" "}
            <span className="text-white">Aisha / Password@123</span>
          </p>
        </div>
      </div>

      <div className="mt-3 rounded-2xl border border-white/10 bg-black/20 p-4">
        <div className="flex items-start gap-3">
          <Database className="mt-0.5 h-4 w-4 text-ledger-blue" />

          <p className="text-xs leading-5 text-ledger-muted">
            Backend source: Django REST Framework with relational database
            models for users, groups, expenses, imports, and audit logs.
          </p>
        </div>
      </div>
    </div>
  );
}