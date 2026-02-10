import React from "react";
import { cn } from "./Button";

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "default" | "secondary" | "destructive" | "outline" | "success" | "warning";
}

export function Badge({ className, variant = "default", ...props }: BadgeProps) {
  const variants = {
    default: "bg-[var(--color-primary)] text-white",
    secondary: "bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text)]",
    destructive: "bg-red-600 text-white",
    outline: "border border-[var(--color-text)] text-[var(--color-text)]",
    success: "bg-green-600 text-white",
    warning: "bg-orange-500 text-white",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-none px-2 py-0.5 text-xs font-bold uppercase tracking-wider transition-colors focus:outline-none focus:ring-0",
        variants[variant],
        className
      )}
      {...props}
    />
  );
}
