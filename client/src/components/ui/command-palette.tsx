import { Command } from "cmdk";
import { useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  CreditCard,
  Wallet,
  Landmark,
  Users,
  Bell,
  Mail,
  Sun,
  Moon,
  LogOut,
} from "lucide-react";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
}

const NAV_ITEMS = [
  { label: "Overview", icon: LayoutDashboard, path: "/overview" },
  { label: "Bank Accounts", icon: CreditCard, path: "/bank-accounts" },
  { label: "Credit Cards", icon: Wallet, path: "/credit-cards" },
  { label: "Loans", icon: Landmark, path: "/loans" },
  { label: "Family", icon: Users, path: "/family" },
  { label: "Reminders", icon: Bell, path: "/reminders" },
  { label: "Invites", icon: Mail, path: "/invites" },
];

export function CommandPalette({ open, onClose }: CommandPaletteProps) {
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const { logout } = useAuth();

  if (!open) return null;

  const run = (action: () => void) => {
    action();
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh] bg-black/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className={cn(
          "w-full max-w-lg overflow-hidden rounded-xl shadow-2xl",
          "border border-slate-200 bg-white",
          "dark:border-white/10 dark:bg-slate-900"
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <Command>
          <Command.Input
            placeholder="Search pages, actions…"
            className={cn(
              "w-full border-b px-4 py-3 text-sm outline-none",
              "border-slate-200 bg-transparent text-slate-900 placeholder:text-slate-400",
              "dark:border-white/10 dark:text-white dark:placeholder:text-slate-500"
            )}
          />
          <Command.List className="max-h-72 overflow-y-auto p-2">
            <Command.Empty className="py-6 text-center text-sm text-slate-500">
              No results found.
            </Command.Empty>

            <Command.Group
              heading="Navigation"
              className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:text-slate-400"
            >
              {NAV_ITEMS.map(({ label, icon: Icon, path }) => (
                <Command.Item
                  key={path}
                  onSelect={() => run(() => navigate(path))}
                  className={cn(
                    "flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-sm",
                    "text-slate-700 hover:bg-slate-100",
                    "dark:text-slate-300 dark:hover:bg-white/5"
                  )}
                >
                  <Icon className="h-4 w-4 opacity-60" />
                  Go to {label}
                </Command.Item>
              ))}
            </Command.Group>

            <Command.Group
              heading="Actions"
              className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:text-slate-400"
            >
              <Command.Item
                onSelect={() => run(toggleTheme)}
                className="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-sm text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-white/5"
              >
                {theme === "dark" ? (
                  <Sun className="h-4 w-4 opacity-60" />
                ) : (
                  <Moon className="h-4 w-4 opacity-60" />
                )}
                Switch to {theme === "dark" ? "Light" : "Dark"} Mode
              </Command.Item>
              <Command.Item
                onSelect={() => run(logout)}
                className="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/10"
              >
                <LogOut className="h-4 w-4 opacity-60" />
                Logout
              </Command.Item>
            </Command.Group>
          </Command.List>
        </Command>
      </div>
    </div>
  );
}
