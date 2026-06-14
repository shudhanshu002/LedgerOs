import { NavLink, useNavigate } from "react-router-dom";
import {
  Activity,
  BrainCircuit,
  CircleDollarSign,
  FileWarning,
  LayoutDashboard,
  LogOut,
  ReceiptText,
  ShieldCheck,
  Users,
} from "lucide-react";
import clsx from "clsx";
import { clearTokens } from "../../lib/api";
import { useActiveWorkspaceName } from "../../hooks/useActiveWorkspaceName";
import { FooterSignature } from "./FooterSignature";
import { MobileNav } from "./MobileNav";
import { RouteTransitionShell } from "./RouteTransitionShell";
import { WorkspaceStatusBar } from "./WorkspaceStatusBar";

const navItems = [
  { label: "Command Center", href: "/dashboard", icon: LayoutDashboard },
  { label: "Groups", href: "/groups", icon: Users },
  { label: "Import Cockpit", href: "/imports", icon: FileWarning },
  { label: "Expenses", href: "/expenses", icon: ReceiptText },
  { label: "AI Review", href: "/ai-review", icon: BrainCircuit },
  { label: "Balances", href: "/balances", icon: CircleDollarSign },
  { label: "Audit Trail", href: "/audit", icon: ShieldCheck },
];

export function AppShell() {
  const navigate = useNavigate();
  const workspaceName = useActiveWorkspaceName();

  function handleLogout() {
    clearTokens();
    navigate("/login");
  }

  return (
    <div className="min-h-screen bg-ledger-bg ledger-grid">
        <MobileNav/>
      <div className="flex min-h-screen">
        <aside className="hidden w-72 border-r border-white/10 bg-black/20 px-5 py-6 backdrop-blur-xl lg:block">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-ledger-green/10 text-ledger-green ring-1 ring-ledger-green/30">
              <Activity className="h-6 w-6" />
            </div>

            <div>
              <p className="font-display text-xl font-semibold tracking-tight">
                LedgerOS
              </p>
              <p className="text-xs text-ledger-muted">
                Shared expense intelligence
              </p>
            </div>
          </div>

          <div className="mt-8 rounded-3xl border border-white/10 bg-white/[0.03] p-4">
            <p className="text-xs uppercase tracking-[0.24em] text-ledger-muted">
              Active workspace
            </p>
            <p className="mt-2 font-display text-lg font-semibold">
              {workspaceName}
            </p>
            <p className="mt-1 text-xs leading-5 text-ledger-muted">
              Import safety, review decisions, balances, and audit trail.
            </p>
          </div>

          <nav className="mt-8 space-y-2">
            {navItems.map((item) => {
              const Icon = item.icon;

              return (
                <NavLink
                  key={item.href}
                  to={item.href}
                  className={({ isActive }) =>
                    clsx(
                      "flex items-center gap-3 rounded-2xl px-4 py-3 text-sm transition",
                      isActive
                        ? "bg-white text-ledger-bg shadow-glow"
                        : "text-ledger-muted hover:bg-white/5 hover:text-white",
                    )
                  }
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </NavLink>
              );
            })}
          </nav>

          <button
            onClick={handleLogout}
            className="mt-8 flex w-full items-center justify-center gap-2 rounded-2xl border border-white/10 px-4 py-3 text-sm text-ledger-muted transition hover:border-ledger-red/40 hover:bg-ledger-red/10 hover:text-ledger-red"
          >
            <LogOut className="h-4 w-4" />
            Logout
          </button>
        </aside>

        <main className="flex-1 px-4 pb-28 pt-5 sm:px-6 lg:px-8 lg:pb-5">
          <div className="mx-auto max-w-7xl">
            <WorkspaceStatusBar />
            <RouteTransitionShell />
            <FooterSignature />
          </div>
        </main>
      </div>
    </div>
  );
}
