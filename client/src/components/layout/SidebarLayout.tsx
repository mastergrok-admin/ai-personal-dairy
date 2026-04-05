import { useEffect, useState } from "react";
import { Outlet } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { Menu, Sun, Moon } from "lucide-react";
import Sidebar from "./Sidebar";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/hooks/useTheme";
import { VerificationBanner } from "@/components/features/auth/VerificationBanner";
import { CommandPalette } from "@/components/ui/command-palette";
import { cn } from "@/lib/utils";

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function SidebarLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [cmdOpen, setCmdOpen] = useState(false);
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const showVerificationBanner = user && !user.emailVerified;

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        setCmdOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-ocean-900">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="lg:pl-60">
        {/* Top bar */}
        <header
          className={cn(
            "sticky top-0 z-30 flex items-center justify-between px-4 py-3 lg:px-6",
            "border-b border-slate-200 bg-white dark:border-white/10 dark:bg-ocean-900/80",
            "backdrop-blur-sm"
          )}
        >
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="rounded-md p-2 text-slate-500 hover:bg-slate-100 dark:text-white/50 dark:hover:bg-white/5 lg:hidden"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="hidden lg:block">
              <span className="text-sm font-medium text-slate-500 dark:text-white/40">
                {greeting()},{" "}
              </span>
              <span className="text-sm font-semibold text-slate-800 dark:text-white">
                {user?.name}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setCmdOpen(true)}
              className={cn(
                "hidden items-center gap-2 rounded-lg border px-3 py-1.5 text-xs sm:flex",
                "border-slate-200 text-slate-500 hover:bg-slate-50 dark:border-white/10 dark:text-white/40 dark:hover:bg-white/5"
              )}
            >
              Search
              <kbd className="rounded border border-slate-200 px-1 py-0.5 text-[10px] dark:border-white/10">
                Ctrl K
              </kbd>
            </button>

            <button
              onClick={toggleTheme}
              className="rounded-md p-2 text-slate-500 hover:bg-slate-100 dark:text-white/50 dark:hover:bg-white/5"
              title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
            >
              {theme === "dark" ? (
                <Sun className="h-4 w-4" />
              ) : (
                <Moon className="h-4 w-4" />
              )}
            </button>
          </div>
        </header>

        {/* Page content */}
        <main className="p-4 lg:p-6">
          {showVerificationBanner && <VerificationBanner />}
          <Outlet />
        </main>
      </div>

      <CommandPalette open={cmdOpen} onClose={() => setCmdOpen(false)} />
      <Toaster position="top-right" />
    </div>
  );
}

export default SidebarLayout;
