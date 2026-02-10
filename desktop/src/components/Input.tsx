import React from "react";
import { cn } from "./Button";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, icon, ...props }, ref) => {
    return (
      <div className="w-full space-y-1">
        {label && (
          <label className="text-xs font-bold text-[var(--color-text-secondary)] uppercase tracking-wider ml-0">
            {label}
          </label>
        )}
        <div className="relative">
          {icon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-secondary)]">
              {icon}
            </div>
          )}
          <input
            ref={ref}
            className={cn(
              "flex h-10 w-full rounded-none bg-[var(--color-surface)] border border-[var(--color-border)] px-4 py-2 text-sm ring-offset-transparent placeholder:text-[var(--color-text-secondary)]/50 focus-visible:outline-none focus-visible:border-[var(--color-primary)] focus-visible:ring-0 disabled:cursor-not-allowed disabled:opacity-50 transition-colors text-[var(--color-text)]",
              icon && "pl-10",
              error && "border-red-500 text-red-900 placeholder:text-red-300",
              className
            )}
            {...props}
          />
        </div>
        {error && <p className="text-xs text-red-500 font-medium mt-1">{error}</p>}
      </div>
    );
  }
);
