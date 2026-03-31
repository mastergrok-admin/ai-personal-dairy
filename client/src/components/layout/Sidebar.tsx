import { NavLink } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useState } from "react";
import toast from "react-hot-toast";

const mainNavItems = [
  { to: "/overview", label: "Overview", icon: "📊" },
  { to: "/bank-accounts", label: "Bank Accounts", icon: "🏦" },
  { to: "/credit-cards", label: "Credit Cards", icon: "💳" },
  { to: "/loans", label: "Loans", icon: "📋" },
  { to: "/family", label: "Family", icon: "👨‍👩‍👧‍👦" },
  { to: "/reminders", label: "Reminders", icon: "🔔" },
];

const adminNavItems = [
  { to: "/admin/users", label: "Users", permission: "user.read" },
  { to: "/admin/roles", label: "Roles", permission: "role.read" },
  { to: "/admin/permissions", label: "Permissions", permission: "permission.read" },
  { to: "/admin/settings", label: "Settings", permission: "admin.settings.read" },
];

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

function Sidebar({ isOpen, onClose }: SidebarProps) {
  const { hasPermission, logout } = useAuth();
  const [adminOpen, setAdminOpen] = useState(false);
  const hasAdminAccess = hasPermission("user.read");

  const linkClasses = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
      isActive
        ? "bg-ocean-accent/15 text-ocean-accent"
        : "text-white/60 hover:bg-white/5 hover:text-white/80"
    }`;

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`fixed left-0 top-0 z-50 flex h-full w-60 flex-col bg-gradient-to-b from-ocean-900 to-ocean-800 transition-transform lg:translate-x-0 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Logo */}
        <div className="flex items-center gap-2 px-4 py-5">
          <span className="bg-gradient-to-r from-ocean-accent to-ocean-violet bg-clip-text text-lg font-bold text-transparent">
            ₹ FinDiary
          </span>
        </div>

        {/* Main nav */}
        <nav className="flex-1 space-y-1 px-3">
          {mainNavItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={linkClasses}
              onClick={onClose}
            >
              <span className="text-base">{item.icon}</span>
              <span>{item.label}</span>
            </NavLink>
          ))}

          {/* Invites */}
          <NavLink to="/invites" className={linkClasses} onClick={onClose}>
            <span className="text-base">✉️</span>
            <span>Invites</span>
          </NavLink>

          {/* Admin section */}
          {hasAdminAccess && (
            <>
              <div className="my-3 border-t border-white/10" />
              <button
                onClick={() => setAdminOpen(!adminOpen)}
                className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm text-white/60 hover:bg-white/5 hover:text-white/80"
              >
                <span className="flex items-center gap-3">
                  <span className="text-base">⚙️</span>
                  <span>Admin</span>
                </span>
                <span className={`transition-transform ${adminOpen ? "rotate-180" : ""}`}>▾</span>
              </button>
              {adminOpen && (
                <div className="ml-6 space-y-1">
                  {adminNavItems
                    .filter((item) => hasPermission(item.permission))
                    .map((item) => (
                      <NavLink
                        key={item.to}
                        to={item.to}
                        className={linkClasses}
                        onClick={onClose}
                      >
                        <span>{item.label}</span>
                      </NavLink>
                    ))}
                </div>
              )}
            </>
          )}
        </nav>

        {/* Logout */}
        <div className="border-t border-white/10 px-3 py-3">
          <button
            onClick={async () => {
              await logout();
              toast.success("Logged out");
            }}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-white/60 hover:bg-white/5 hover:text-white/80"
          >
            <span className="text-base">🚪</span>
            <span>Logout</span>
          </button>
        </div>
      </aside>
    </>
  );
}

export default Sidebar;
