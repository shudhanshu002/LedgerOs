import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { getAccessToken } from "../lib/api";
import { AppShell } from "../components/layout/AppShell";
import { LoginPage } from "../features/auth/LoginPage";
import { DashboardPage } from "../features/dashboard/DashboardPage";
import { GroupsPage } from "../features/groups/GroupsPage";
import { ImportCockpitPage } from "../features/imports/ImportCockpitPage";
import { AiReviewPage } from "../features/imports/AiReviewPage";
import { ExpensesPage } from "../features/expenses/ExpensesPage";
import { BalancesPage } from "../features/balances/BalancesPage";
import { AuditTrailPage } from "../features/audit/AuditTrailPage";
import { NotFoundPage } from "./NotFoundPage";

function ProtectedRoute() {
  if (!getAccessToken()) {
    return <Navigate to="/login" replace />;
  }

  return <AppShell />;
}

export function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />

        <Route element={<ProtectedRoute />}>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/groups" element={<GroupsPage />} />
          <Route path="/imports" element={<ImportCockpitPage />} />
          <Route path="/expenses" element={<ExpensesPage />} />
          <Route path="/ai-review" element={<AiReviewPage />} />
          <Route path="/balances" element={<BalancesPage />} />
          <Route path="/audit" element={<AuditTrailPage />} />
        </Route>

        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </BrowserRouter>
  );
}
