import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Compass,
  FileWarning,
  Home,
  ShieldCheck,
} from "lucide-react";
import { usePageTitle } from "../hooks/usePageTitle";

export function NotFoundPage() {
  const navigate = useNavigate();

  usePageTitle("Page Not Found");

  return (
    <main className="relative min-h-screen overflow-hidden bg-ledger-bg px-6 py-8 text-white">
      <div className="absolute inset-0 ledger-grid opacity-60" />

      <div className="relative mx-auto flex min-h-[calc(100vh-4rem)] max-w-5xl items-center justify-center">
        <div className="glass-panel ring-gradient w-full rounded-[2rem] p-8 text-center md:p-12">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-[1.7rem] border border-ledger-amber/20 bg-ledger-amber/10 text-ledger-amber">
            <Compass className="h-9 w-9" />
          </div>

          <p className="mt-8 text-sm uppercase tracking-[0.28em] text-ledger-green">
            LedgerOS route guard
          </p>

          <h1 className="mx-auto mt-4 max-w-3xl font-display text-5xl font-semibold tracking-tight md:text-6xl">
            This ledger route does not exist.
          </h1>

          <p className="mx-auto mt-5 max-w-2xl text-sm leading-7 text-ledger-muted md:text-base">
            The requested page is outside the current shared-expense workspace.
            Return to the command center or go back to the previous screen.
          </p>

          <div className="mt-8 grid gap-4 md:grid-cols-3">
            <div className="rounded-3xl border border-ledger-green/20 bg-ledger-green/10 p-5">
              <ShieldCheck className="mx-auto h-5 w-5 text-ledger-green" />
              <p className="mt-3 font-display text-lg font-semibold">
                Protected app
              </p>
              <p className="mt-2 text-xs leading-5 text-ledger-muted">
                Routes are scoped to authenticated workspace screens.
              </p>
            </div>

            <div className="rounded-3xl border border-ledger-blue/20 bg-ledger-blue/10 p-5">
              <Home className="mx-auto h-5 w-5 text-ledger-blue" />
              <p className="mt-3 font-display text-lg font-semibold">
                Dashboard first
              </p>
              <p className="mt-2 text-xs leading-5 text-ledger-muted">
                Use Command Center as the main product entry point.
              </p>
            </div>

            <div className="rounded-3xl border border-ledger-amber/20 bg-ledger-amber/10 p-5">
              <FileWarning className="mx-auto h-5 w-5 text-ledger-amber" />
              <p className="mt-3 font-display text-lg font-semibold">
                Review workflow
              </p>
              <p className="mt-2 text-xs leading-5 text-ledger-muted">
                Import, review, commit, balance, and audit are the core routes.
              </p>
            </div>
          </div>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <button
              onClick={() => navigate("/dashboard")}
              className="flex items-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-semibold text-ledger-bg transition hover:scale-[1.01]"
            >
              <Home className="h-4 w-4" />
              Go to Command Center
            </button>

            <button
              onClick={() => navigate(-1)}
              className="flex items-center gap-2 rounded-2xl border border-white/10 px-5 py-3 text-sm font-medium text-ledger-muted transition hover:bg-white/5 hover:text-white"
            >
              <ArrowLeft className="h-4 w-4" />
              Go back
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}