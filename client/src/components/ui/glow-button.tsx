import { cn } from "@/lib/utils";
import type { ButtonHTMLAttributes } from "react";

interface GlowButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  className?: string;
}

export function GlowButton({
  children,
  className,
  ...props
}: GlowButtonProps) {
  return (
    <button
      className={cn(
        "relative rounded-lg px-4 py-2 text-sm font-medium transition-all duration-200",
        // light
        "border border-blue-300 bg-blue-50 text-blue-700 hover:bg-blue-100",
        // dark
        "dark:border-ocean-accent/40 dark:bg-ocean-accent/[0.08] dark:text-ocean-accent",
        "dark:shadow-[0_0_20px_rgba(56,189,248,0.15)] dark:hover:shadow-[0_0_30px_rgba(56,189,248,0.25)]",
        "disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}
