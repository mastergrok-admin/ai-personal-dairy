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
  ChevronsLeft,
  ChevronsRight,
  TrendingUp,
  ShoppingCart,
  Handshake,
  PieChart,
  BarChart3,
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
  { to: "/income", label: "Income", icon: TrendingUp },
  { to: "/expenses", label: "Expenses", icon: ShoppingCart },
  { to: "/lending", label: "Lending", icon: Handshake },
  { to: "/net-worth", label: "Net Worth", icon: PieChart },
  { to: "/investments", label: "Investments", icon: BarChart3 },
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
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

function Sidebar({ isOpen, onClose, isCollapsed, onToggleCollapse }: SidebarProps) {
  const { user, hasPermission, logout } = useAuth();
  const [adminOpen, setAdminOpen] = useState(false);
  const hasAdminAccess = hasPermission("user.read");

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    cn(
      "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
      isCollapsed && "lg:justify-center lg:px-2",
      isActive
        ? "bg-ocean-accent/15 text-ocean-accent"
        : "text-white/60 hover:bg-white/5 hover:text-white/80 lg:text-slate-600 lg:hover:bg-slate-100 lg:hover:text-slate-900 dark:lg:text-slate-300 dark:lg:hover:bg-white/10 dark:lg:hover:text-white"
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
          "fixed left-0 top-0 z-50 flex h-full flex-col transition-all duration-300",
          // mobile width always full
          "w-60",
          // desktop width based on collapse state
          isCollapsed ? "lg:w-16" : "lg:w-60",
          // mobile background: dark gradient
          "bg-gradient-to-b from-ocean-900 to-ocean-800",
          // desktop light mode: white
          "lg:from-white lg:to-white lg:bg-white lg:border-r lg:border-slate-200",
          // desktop dark mode: dark
          "dark:lg:from-slate-900 dark:lg:to-slate-900 dark:lg:bg-slate-900 dark:lg:border-white/10",
          // mobile slide animation
          "transition-transform lg:translate-x-0",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Logo + collapse toggle */}
        <div className={cn(
          "flex items-center px-4 py-5",
          isCollapsed ? "lg:justify-center lg:px-2" : "justify-between"
        )}>
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-ocean-accent to-ocean-violet text-sm font-bold text-slate-900">
              ₹
            </div>
            {!isCollapsed && (
              <span className="bg-gradient-to-r from-ocean-accent to-ocean-violet bg-clip-text text-lg font-bold text-transparent lg:from-blue-600 lg:to-blue-800 dark:lg:from-ocean-accent dark:lg:to-ocean-violet">
                FinDiary
              </span>
            )}
          </div>

          {/* Collapse toggle — desktop only */}
          <button
            onClick={onToggleCollapse}
            className={cn(
              "hidden lg:flex items-center justify-center rounded-md p-1.5 transition-colors",
              "text-slate-400 hover:bg-slate-100 hover:text-slate-700",
              "dark:text-slate-500 dark:hover:bg-white/10 dark:hover:text-slate-300",
              isCollapsed && "lg:mt-0"
            )}
            title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {isCollapsed
              ? <ChevronsRight className="h-4 w-4" />
              : <ChevronsLeft className="h-4 w-4" />
            }
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 space-y-0.5 overflow-y-auto px-3">
          {mainNavItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={linkClass}
              onClick={onClose}
              title={isCollapsed ? item.label : undefined}
            >
              <item.icon className="h-4 w-4 shrink-0" />
              {!isCollapsed && <span>{item.label}</span>}
            </NavLink>
          ))}

          {hasAdminAccess && (
            <>
              <div className="my-2 border-t border-white/10 lg:border-slate-200 dark:lg:border-white/10" />

              {isCollapsed ? (
                /* Collapsed: show admin items as icon-only */
                adminNavItems
                  .filter((item) => hasPermission(item.permission))
                  .map((item) => (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      className={linkClass}
                      onClick={onClose}
                      title={item.label}
                    >
                      <item.icon className="h-4 w-4 shrink-0" />
                    </NavLink>
                  ))
              ) : (
                /* Expanded: admin accordion */
                <>
                  <button
                    onClick={() => setAdminOpen(!adminOpen)}
                    className={cn(
                      "flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm transition-colors",
                      "text-white/60 hover:bg-white/5 hover:text-white/80",
                      "lg:text-slate-600 lg:hover:bg-slate-100 lg:hover:text-slate-900",
                      "dark:lg:text-slate-300 dark:lg:hover:bg-white/10 dark:lg:hover:text-white"
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
            </>
          )}
        </nav>

        {/* User footer */}
        <div className={cn(
          "border-t border-white/10 px-3 py-3",
          "lg:border-slate-200 dark:lg:border-white/10"
        )}>
          <div className={cn(
            "flex items-center gap-2.5 rounded-lg px-2 py-2",
            isCollapsed && "lg:justify-center lg:px-0"
          )}>
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-ocean-accent to-ocean-violet text-xs font-bold text-slate-900">
              {initials}
            </div>
            {!isCollapsed && (
              <>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-semibold text-white/80 lg:text-slate-800 dark:lg:text-slate-100">
                    {user?.name}
                  </p>
                  <p className="truncate text-[10px] text-white/40 lg:text-slate-400 dark:lg:text-slate-500">
                    {user?.email}
                  </p>
                </div>
                <button
                  onClick={async () => {
                    await logout();
                    toast.success("Logged out");
                  }}
                  className="shrink-0 rounded-md p-1 text-white/40 hover:text-white/80 lg:text-slate-400 lg:hover:text-slate-700 dark:lg:text-slate-500 dark:lg:hover:text-slate-300"
                  title="Logout"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </>
            )}
            {isCollapsed && (
              <button
                onClick={async () => {
                  await logout();
                  toast.success("Logged out");
                }}
                className="hidden lg:flex shrink-0 rounded-md p-1 text-slate-400 hover:text-slate-700 dark:text-slate-500 dark:hover:text-slate-300"
                title="Logout"
              >
                <LogOut className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </aside>
    </>
  );
}

export default Sidebar;
