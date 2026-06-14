import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { getAccessToken } from "../lib/api";
import { AppShell } from "../components/layout/AppShell";
import { LoginPage } from "../features/auth/LoginPage";
import { DashboardPage } from "../features/dashboard/DashboardPage";

function ProtectedRoute() {
  if (!getAccessToken()) {
    return <Navigate to="/login" replace />;
  }

  return <AppShell />;
}

function PlaceholderPage({ title }: { title: string }) {
  return (
    <section className="py-8">
      <p className="text-sm uppercase tracking-[0.28em] text-ledger-green">
        LedgerOS
      </p>
      <h1 className="mt-3 font-display text-5xl font-semibold tracking-tight">
        {title}
      </h1>
      <p className="mt-4 max-w-2xl text-ledger-muted">
        This page will connect directly to the backend APIs already verified in
        Postman.
      </p>
    </section>
  );
}

export function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />

        <Route element={<ProtectedRoute />}>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/groups" element={<PlaceholderPage title="Groups" />} />
          <Route
            path="/imports"
            element={<PlaceholderPage title="Import Cockpit" />}
          />
          <Route
            path="/ai-review"
            element={<PlaceholderPage title="AI Review" />}
          />
          <Route
            path="/balances"
            element={<PlaceholderPage title="Balances" />}
          />
          <Route
            path="/audit"
            element={<PlaceholderPage title="Audit Trail" />}
          />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}