import { Link, Navigate, useSearchParams } from "react-router-dom";
import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/hooks/useTheme";
import { LoginForm } from "@/components/features/auth/LoginForm";
import { OAuthButtons } from "@/components/features/auth/OAuthButtons";
import { AuroraText } from "@/components/ui/aurora-text";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";

function LoginPage() {
  const { isAuthenticated, isLoading } = useAuth();
  const { theme } = useTheme();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const error = searchParams.get("error");
    if (error) toast.error(decodeURIComponent(error));
    if (searchParams.get("verified") === "true")
      toast.success("Email verified! You can now sign in.");
  }, [searchParams]);

  if (isLoading) return null;
  if (isAuthenticated) return <Navigate to="/dashboard" replace />;

  return (
    <div
      className={cn(
        "flex min-h-[80vh] items-center justify-center px-4",
        "bg-[radial-gradient(ellipse_at_50%_0%,rgba(56,189,248,0.08)_0%,transparent_70%)]"
      )}
    >
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="mb-8 text-center">
          {theme === "dark" ? (
            <AuroraText className="text-3xl font-black">₹ FinDiary</AuroraText>
          ) : (
            <span className="text-3xl font-black text-blue-700">₹ FinDiary</span>
          )}
          <p className="mt-2 text-sm text-slate-500 dark:text-white/40">
            Your family's financial companion
          </p>
        </div>

        {/* Card */}
        <div
          className={cn(
            "rounded-2xl border p-8 shadow-2xl",
            "border-slate-200 bg-white",
            "dark:border-white/8 dark:bg-white/[0.03] dark:backdrop-blur-xl"
          )}
        >
          <LoginForm />

          <div className="my-6 flex items-center gap-3">
            <div className="flex-1 border-t border-slate-200 dark:border-white/10" />
            <span className="text-xs text-slate-400 dark:text-white/30">
              or continue with
            </span>
            <div className="flex-1 border-t border-slate-200 dark:border-white/10" />
          </div>

          <OAuthButtons />

          <p className="mt-6 text-center text-sm text-slate-600 dark:text-white/40">
            Don't have an account?{" "}
            <Link
              to="/register"
              className="font-medium text-blue-600 hover:text-blue-500 dark:text-ocean-accent dark:hover:text-ocean-accent/80"
            >
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default LoginPage;
