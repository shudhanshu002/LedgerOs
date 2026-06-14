import { type FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Activity, ArrowRight, LockKeyhole, ShieldCheck } from "lucide-react";
import { usePageTitle } from "../../hooks/usePageTitle";
import { AuthStatusCard } from "./AuthStatusCard";
import { loginUser } from "./authApi";
import { DEMO_CREDENTIALS } from "./types";

export function LoginPage() {
  usePageTitle("Login");

  const navigate = useNavigate();

  const [username, setUsername] = useState(DEMO_CREDENTIALS.username);
  const [password, setPassword] = useState(DEMO_CREDENTIALS.password);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      await loginUser({
        username,
        password,
      });

      navigate("/dashboard");
    } catch {
      setError("Login failed. Check username and password.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-ledger-bg px-6 py-8 text-white">
      <div className="absolute inset-0 ledger-grid opacity-60" />

      <div className="relative mx-auto grid min-h-[calc(100vh-4rem)] max-w-7xl items-center gap-10 lg:grid-cols-[1.1fr_0.9fr]">
        <section>
          <div className="inline-flex items-center gap-2 rounded-full border border-ledger-green/20 bg-ledger-green/10 px-4 py-2 text-sm text-ledger-green">
            <ShieldCheck className="h-4 w-4" />
            Splitwise-style ledger, import review, and audit safety
          </div>

          <h1 className="mt-7 max-w-4xl font-display text-6xl font-semibold leading-[0.95] tracking-tight md:text-7xl">
            Financial truth before balances move.
          </h1>

          <p className="mt-6 max-w-2xl text-lg leading-8 text-ledger-muted">
            LedgerOS turns messy shared expense CSVs into a safe review cockpit:
            anomalies first, approvals second, balances last.
          </p>

          <div className="mt-8 grid max-w-3xl gap-4 sm:grid-cols-3">
            {[
              ["42", "CSV rows reviewed"],
              ["39", "issues detected"],
              ["16", "safe rows committed"],
            ].map(([value, label]) => (
              <div
                key={label}
                className="rounded-3xl border border-white/10 bg-white/[0.04] p-5"
              >
                <p className="font-display text-3xl font-semibold">{value}</p>
                <p className="mt-1 text-sm text-ledger-muted">{label}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="glass-panel ring-gradient rounded-[2rem] p-6 md:p-8">
          <div className="mb-8 flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-ledger-green/10 text-ledger-green ring-1 ring-ledger-green/30">
              <Activity className="h-6 w-6" />
            </div>

            <div>
              <p className="font-display text-2xl font-semibold">LedgerOS</p>
              <p className="text-sm text-ledger-muted">Demo operator login</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="text-sm text-ledger-muted">Username</label>
              <input
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                className="mt-2 w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-white outline-none transition placeholder:text-ledger-muted focus:border-ledger-green/50"
              />
            </div>

            <div>
              <label className="text-sm text-ledger-muted">Password</label>
              <div className="relative mt-2">
                <LockKeyhole className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-ledger-muted" />
                <input
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  type="password"
                  className="w-full rounded-2xl border border-white/10 bg-white/[0.04] py-3 pl-11 pr-4 text-white outline-none transition placeholder:text-ledger-muted focus:border-ledger-green/50"
                />
              </div>
            </div>

            {error ? (
              <div className="rounded-2xl border border-ledger-red/20 bg-ledger-red/10 px-4 py-3 text-sm text-ledger-red">
                {error}
              </div>
            ) : null}

            <button
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-white px-4 py-3 font-semibold text-ledger-bg transition hover:scale-[1.01] disabled:opacity-60"
            >
              {loading ? "Signing in..." : "Enter Command Center"}
              <ArrowRight className="h-4 w-4" />
            </button>
          </form>

          <AuthStatusCard />
        </section>
      </div>
    </main>
  );
}
