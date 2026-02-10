import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "./Button";

export type DropdownOption<T extends string> = {
  value: T;
  label: string;
};

export function Dropdown<T extends string>({
  value,
  options,
  onChange,
  disabled,
  className,
}: {
  value: T;
  options: DropdownOption<T>[];
  onChange: (value: T) => void;
  disabled?: boolean;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const selected = useMemo(() => options.find((opt) => opt.value === value), [options, value]);

  useEffect(() => {
    const handleMouseDown = (event: MouseEvent) => {
      if (!rootRef.current) return;
      if (!rootRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", handleMouseDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleMouseDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  return (
    <div className={cn("relative min-w-[140px]", className)} ref={rootRef}>
      <button
        className={cn(
          "flex items-center justify-between w-full h-10 px-3 py-2 text-sm bg-[var(--color-surface)] border border-[var(--color-border)] rounded-none focus:outline-none focus:border-[var(--color-primary)] transition-colors text-[var(--color-text)]",
          disabled ? "opacity-50 cursor-not-allowed" : "hover:border-[var(--color-accent)]",
          open && "border-[var(--color-primary)]"
        )}
        type="button"
        onClick={() => (disabled ? null : setOpen((prev) => !prev))}
        aria-haspopup="listbox"
        aria-expanded={open}
        disabled={disabled}
      >
        <span className="truncate mr-2 font-medium">{selected?.label ?? ""}</span>
        <ChevronDown className={cn("w-4 h-4 text-[var(--color-text-secondary)] transition-transform", open && "rotate-180")} />
      </button>
      
      {open && (
        <div className="absolute z-20 w-full mt-[-1px] bg-[var(--color-surface)] border border-[var(--color-border)] border-t-0 rounded-none shadow-none animate-in fade-in zoom-in-95 duration-100">
          <div className="py-0 max-h-60 overflow-auto">
            {options.map((opt) => (
              <button
                key={opt.value}
                type="button"
                className={cn(
                  "w-full text-left px-3 py-2 text-sm transition-colors border-b border-[var(--color-border)] last:border-0",
                  opt.value === value
                    ? "bg-[var(--color-primary)] text-white font-bold"
                    : "text-[var(--color-text)] hover:bg-[var(--color-bg)] hover:text-[var(--color-accent)]"
                )}
                role="option"
                aria-selected={opt.value === value}
                onClick={() => {
                  onChange(opt.value);
                  setOpen(false);
                }}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
