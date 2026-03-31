import { Routes, Route, Navigate } from "react-router-dom";
import Layout from "./components/layout/Layout";
import SidebarLayout from "./components/layout/SidebarLayout";
import HomePage from "./pages/HomePage";
import NotFoundPage from "./pages/NotFoundPage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import AuthCallbackPage from "./pages/AuthCallbackPage";
import OverviewPage from "./pages/OverviewPage";
import FamilyPage from "./pages/finance/FamilyPage";
import BankAccountsPage from "./pages/finance/BankAccountsPage";
import AdminUsersPage from "./pages/admin/AdminUsersPage";
import AdminRolesPage from "./pages/admin/AdminRolesPage";
import AdminPermissionsPage from "./pages/admin/AdminPermissionsPage";
import InvitePage from "./pages/InvitePage";
import AdminSettingsPage from "./pages/admin/AdminSettingsPage";
import { ProtectedRoute } from "./components/features/auth/ProtectedRoute";

function App() {
  return (
    <Routes>
      {/* Public routes — simple header layout */}
      <Route path="/" element={<Layout />}>
        <Route index element={<HomePage />} />
        <Route path="login" element={<LoginPage />} />
        <Route path="register" element={<RegisterPage />} />
        <Route path="auth/callback" element={<AuthCallbackPage />} />
      </Route>

      {/* Authenticated routes — sidebar layout */}
      <Route
        element={
          <ProtectedRoute>
            <SidebarLayout />
          </ProtectedRoute>
        }
      >
        <Route path="overview" element={<OverviewPage />} />
        <Route path="dashboard" element={<Navigate to="/overview" replace />} />
        <Route path="bank-accounts" element={<BankAccountsPage />} />
        <Route path="family" element={<FamilyPage />} />
        <Route path="invites" element={<InvitePage />} />

        {/* Placeholder routes for future pages */}
        <Route path="credit-cards" element={<OverviewPage />} />
        <Route path="loans" element={<OverviewPage />} />
        <Route path="reminders" element={<OverviewPage />} />

        {/* Admin routes */}
        <Route path="admin/users" element={<ProtectedRoute permission="user.read"><AdminUsersPage /></ProtectedRoute>} />
        <Route path="admin/roles" element={<ProtectedRoute permission="role.read"><AdminRolesPage /></ProtectedRoute>} />
        <Route path="admin/permissions" element={<ProtectedRoute permission="permission.read"><AdminPermissionsPage /></ProtectedRoute>} />
        <Route path="admin/settings" element={<ProtectedRoute permission="admin.settings.read"><AdminSettingsPage /></ProtectedRoute>} />
      </Route>

      <Route path="*" element={<Layout />}>
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}

export default App;
