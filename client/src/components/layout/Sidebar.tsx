import { NavLink } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useState } from "react";
import {
  LayoutDashboard,
  CreditCard,
  Wallet,
  Landmark,
  Users,
  Bell,
  Mail,
  ShieldCheck,
  Users2,
  KeyRound,
  Settings,
  ChevronDown,
  LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";

const mainNavItems = [
  { to: "/overview", label: "Overview", icon: LayoutDashboard },
  { to: "/bank-accounts", label: "Bank Accounts", icon: CreditCard },
  { to: "/credit-cards", label: "Credit Cards", icon: Wallet },
  { to: "/loans", label: "Loans", icon: Landmark },
  { to: "/family", label: "Family", icon: Users },
  { to: "/reminders", label: "Reminders", icon: Bell },
  { to: "/invites", label: "Invites", icon: Mail },
];

const adminNavItems = [
  { to: "/admin/users", label: "Users", permission: "user.read", icon: Users2 },
  { to: "/admin/roles", label: "Roles", permission: "role.read", icon: ShieldCheck },
  { to: "/admin/permissions", label: "Permissions", permission: "permission.read", icon: KeyRound },
  { to: "/admin/settings", label: "Settings", permission: "admin.settings.read", icon: Settings },
];

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

function Sidebar({ isOpen, onClose }: SidebarProps) {
  const { user, hasPermission, logout } = useAuth();
  const [adminOpen, setAdminOpen] = useState(false);
  const hasAdminAccess = hasPermission("user.read");

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    cn(
      "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
      isActive
        ? "bg-ocean-accent/15 text-ocean-accent dark:bg-ocean-accent/15 dark:text-ocean-accent lg:bg-blue-50 lg:text-blue-700"
        : "text-white/60 hover:bg-white/5 hover:text-white/80 dark:text-white/60 dark:hover:bg-white/5 dark:hover:text-white/80 lg:text-slate-600 lg:hover:bg-slate-100 lg:hover:text-slate-900"
    );

  const initials = user?.name
    ? user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "?";

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={cn(
          "fixed left-0 top-0 z-50 flex h-full w-60 flex-col",
          "bg-gradient-to-b from-ocean-900 to-ocean-800",
          "dark:from-ocean-900 dark:to-ocean-800",
          "lg:from-white lg:to-white lg:border-r lg:border-slate-200 lg:bg-none lg:bg-white",
          "transition-transform lg:translate-x-0",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Logo */}
        <div className="flex items-center gap-2.5 px-4 py-5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-ocean-accent to-ocean-violet text-sm font-bold text-slate-900">
            ₹
          </div>
          <span className="bg-gradient-to-r from-ocean-accent to-ocean-violet bg-clip-text text-lg font-bold text-transparent dark:from-ocean-accent dark:to-ocean-violet lg:from-blue-600 lg:to-blue-800">
            FinDiary
          </span>
        </div>

        {/* Nav */}
        <nav className="flex-1 space-y-0.5 overflow-y-auto px-3">
          {mainNavItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={linkClass}
              onClick={onClose}
            >
              <item.icon className="h-4 w-4 shrink-0" />
              <span>{item.label}</span>
            </NavLink>
          ))}

          {hasAdminAccess && (
            <>
              <div className="my-2 border-t border-white/10 dark:border-white/10 lg:border-slate-200" />
              <button
                onClick={() => setAdminOpen(!adminOpen)}
                className={cn(
                  "flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm",
                  "text-white/60 hover:bg-white/5 hover:text-white/80",
                  "dark:text-white/60 dark:hover:bg-white/5",
                  "lg:text-slate-600 lg:hover:bg-slate-100 lg:hover:text-slate-900"
                )}
              >
                <span className="flex items-center gap-3">
                  <Settings className="h-4 w-4" />
                  Admin
                </span>
                <ChevronDown
                  className={cn(
                    "h-4 w-4 transition-transform",
                    adminOpen && "rotate-180"
                  )}
                />
              </button>
              {adminOpen && (
                <div className="ml-7 space-y-0.5">
                  {adminNavItems
                    .filter((item) => hasPermission(item.permission))
                    .map((item) => (
                      <NavLink
                        key={item.to}
                        to={item.to}
                        className={linkClass}
                        onClick={onClose}
                      >
                        <item.icon className="h-4 w-4 shrink-0" />
                        <span>{item.label}</span>
                      </NavLink>
                    ))}
                </div>
              )}
            </>
          )}
        </nav>

        {/* User footer */}
        <div className="border-t border-white/10 px-3 py-3 dark:border-white/10 lg:border-slate-200">
          <div className="flex items-center gap-2.5 rounded-lg px-2 py-2">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-ocean-accent to-ocean-violet text-xs font-bold text-slate-900">
              {initials}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-semibold text-white/80 dark:text-white/80 lg:text-slate-800">
                {user?.name}
              </p>
              <p className="truncate text-[10px] text-white/40 dark:text-white/40 lg:text-slate-400">
                {user?.email}
              </p>
            </div>
            <button
              onClick={async () => {
                await logout();
                toast.success("Logged out");
              }}
              className="shrink-0 rounded-md p-1 text-white/40 hover:text-white/80 dark:text-white/40 dark:hover:text-white/80 lg:text-slate-400 lg:hover:text-slate-700"
              title="Logout"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}

export default Sidebar;
