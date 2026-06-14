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

const mobileItems = [
  {
    label: "Home",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    label: "Groups",
    href: "/groups",
    icon: Users,
  },
  {
    label: "Import",
    href: "/imports",
    icon: FileWarning,
  },
  {
    label: "Expenses",
    href: "/expenses",
    icon: ReceiptText,
  },
  {
    label: "AI",
    href: "/ai-review",
    icon: BrainCircuit,
  },
  {
    label: "Money",
    href: "/balances",
    icon: CircleDollarSign,
  },
  {
    label: "Audit",
    href: "/audit",
    icon: ShieldCheck,
  },
];

export function MobileNav() {
  const navigate = useNavigate();
  const workspaceName = useActiveWorkspaceName();

  function handleLogout() {
    clearTokens();
    navigate("/login");
  }

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-white/10 bg-ledger-bg/80 px-4 py-4 backdrop-blur-xl lg:hidden">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-ledger-green/10 text-ledger-green ring-1 ring-ledger-green/30">
              <Activity className="h-5 w-5" />
            </div>

            <div>
              <p className="font-display text-lg font-semibold tracking-tight">
                LedgerOS
              </p>
              <p className="text-xs text-ledger-muted">{workspaceName}</p>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="rounded-2xl border border-white/10 p-3 text-ledger-muted transition hover:border-ledger-red/40 hover:bg-ledger-red/10 hover:text-ledger-red"
            aria-label="Logout"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </header>

      <nav className="fixed bottom-3 left-3 right-3 z-50 rounded-[1.7rem] border border-white/10 bg-ledger-panel/90 p-2 shadow-card backdrop-blur-xl lg:hidden">
        <div className="grid grid-cols-7 gap-1">
          {mobileItems.map((item) => {
            const Icon = item.icon;

            return (
              <NavLink
                key={item.href}
                to={item.href}
                className={({ isActive }) =>
                  clsx(
                    "flex flex-col items-center justify-center gap-1 rounded-2xl px-2 py-2 text-[10px] transition",
                    isActive
                      ? "bg-white text-ledger-bg"
                      : "text-ledger-muted hover:bg-white/5 hover:text-white",
                  )
                }
              >
                <Icon className="h-4 w-4" />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </div>
      </nav>
    </>
  );
}
