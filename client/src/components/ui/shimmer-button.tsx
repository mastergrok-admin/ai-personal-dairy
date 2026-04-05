import { cn } from "@/lib/utils";
import type { ButtonHTMLAttributes } from "react";

interface ShimmerButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  className?: string;
}

export function ShimmerButton({
  children,
  className,
  ...props
}: ShimmerButtonProps) {
  return (
    <button
      className={cn(
        "relative overflow-hidden rounded-lg px-4 py-2 text-sm font-semibold",
        // dark mode: sky→violet gradient with shimmer
        "dark:bg-gradient-to-r dark:from-ocean-accent dark:to-ocean-violet dark:text-slate-900",
        "dark:shadow-[0_4px_20px_rgba(56,189,248,0.35)]",
        "dark:before:absolute dark:before:inset-0",
        "dark:before:animate-shimmer dark:before:bg-[length:200%_100%]",
        "dark:before:bg-gradient-to-r dark:before:from-transparent dark:before:via-white/40 dark:before:to-transparent",
        // light mode: solid blue gradient
        "bg-gradient-to-r from-blue-600 to-blue-700 text-white",
        "hover:from-blue-700 hover:to-blue-800",
        "transition-transform hover:scale-[1.02] active:scale-[0.98]",
        "disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}
