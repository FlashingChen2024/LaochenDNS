import { NavLink, useLocation } from "react-router-dom";
import { Globe, Zap, Plug, Settings, Lock } from "lucide-react";
import { cn } from "./Button";
import { useApp } from "../app/AppContext";
import logo from "../assets/logo.png";

export function Sidebar() {
  const { setMasterPassword } = useApp();
  const location = useLocation();

  const navItems = [
    { to: "/domains", icon: Globe, label: "域名资产" },
    { to: "/smart-resolve", icon: Zap, label: "智能解析" },
    { to: "/integrations", icon: Plug, label: "服务接入" },
    { to: "/settings", icon: Settings, label: "系统设置" },
  ];

  return (
    <aside className="w-64 h-screen fixed left-0 top-0 flex flex-col bg-[var(--color-bg)] border-r border-[var(--color-border)] z-50">
      {/* Brand - Swiss Style: Bold, Simple, Image/Text Balance */}
      <div className="h-24 flex items-center px-8">
        <div className="flex items-center gap-4">
          <img src={logo} alt="LaoChenDNS" className="w-8 h-8 object-contain" />
          <div className="flex flex-col">
            <span className="text-base font-bold tracking-tight leading-none text-[var(--color-accent)]">LaoChen</span>
            <span className="text-base font-normal tracking-tight leading-none text-[var(--color-text-secondary)]">DNS</span>
          </div>
        </div>
      </div>

      {/* Nav - Functionalist: High Contrast Active State, Minimalist */}
      <nav className="flex-1 px-4 py-8 space-y-2">
        {navItems.map((item) => {
          const isActive = 
            location.pathname.startsWith(item.to) || 
            (item.to === "/domains" && location.pathname.startsWith("/records"));
          
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={cn(
                "flex items-center gap-4 px-4 py-3 rounded-none transition-all duration-200 group relative",
                isActive
                  ? "text-[var(--color-accent)] font-semibold"
                  : "text-[var(--color-text-secondary)] hover:text-[var(--color-text)]"
              )}
            >
              <>
                {/* Active Indicator - Braun Style Orange Dot */}
                {isActive && (
                  <div className="absolute left-0 w-1 h-1 bg-[var(--color-primary)] rounded-full" />
                )}
                <item.icon className={cn("w-5 h-5", isActive ? "text-[var(--color-accent)]" : "text-[var(--color-text-secondary)] group-hover:text-[var(--color-text)]")} strokeWidth={isActive ? 2.5 : 2} />
                <span className="uppercase tracking-wide text-xs">{item.label}</span>
              </>
            </NavLink>
          );
        })}
      </nav>

      {/* Footer - Minimalist */}
      <div className="p-8 border-t border-[var(--color-border)]">
        <button
          onClick={() => setMasterPassword(null)}
          className="flex items-center gap-3 w-full text-xs font-medium uppercase tracking-wide text-[var(--color-destructive)] hover:opacity-80 transition-opacity"
        >
          <Lock className="w-4 h-4" />
          锁定
        </button>
      </div>
    </aside>
  );
}
