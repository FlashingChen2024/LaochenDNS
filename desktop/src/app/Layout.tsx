import { Outlet } from "react-router-dom";
import { Sidebar } from "../components/Sidebar";

export function Layout() {
  return (
    <div className="min-h-screen bg-[var(--color-bg)] text-[var(--color-text)] font-sans">
      <Sidebar />
      <main className="ml-64 p-8 min-h-screen transition-all duration-300">
        <div className="max-w-7xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
