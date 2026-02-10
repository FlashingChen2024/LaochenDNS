import { useEffect } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { X, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { useApp } from "./app/AppContext";
import { Layout } from "./app/Layout";
import { DomainsPage } from "./pages/DomainsPage";
import { IntegrationsPage } from "./pages/IntegrationsPage";
import { RecordsPage } from "./pages/RecordsPage";
import { SettingsPage } from "./pages/SettingsPage";
import { SmartResolvePage } from "./pages/SmartResolvePage";
import { SetupPage } from "./pages/SetupPage";
import { UnlockPage } from "./pages/UnlockPage";

function NoticeStack() {
  const { notices, dismissNotice } = useApp();

  if (notices.length === 0) return null;

  return (
    <div className="fixed top-6 right-6 z-50 flex flex-col gap-4 w-full max-w-sm pointer-events-none">
      {notices.map((notice) => (
        <div
          key={notice.id}
          className={`pointer-events-auto flex items-start p-4 border rounded-xl shadow-2xl backdrop-blur-md transition-all duration-500 animate-slide-in-right ${
            notice.type === "success"
              ? "bg-white/80 border-green-200/50 text-green-800 dark:bg-zinc-900/80 dark:border-green-900/50 dark:text-green-300"
              : "bg-white/80 border-red-200/50 text-red-800 dark:bg-zinc-900/80 dark:border-red-900/50 dark:text-red-300"
          }`}
        >
          {notice.type === "success" ? (
            <CheckCircle2 className="w-5 h-5 mt-0.5 mr-3 shrink-0 text-green-500" />
          ) : (
            <AlertCircle className="w-5 h-5 mt-0.5 mr-3 shrink-0 text-red-500" />
          )}
          <div className="flex-1 text-sm font-medium tracking-tight leading-relaxed pt-0.5">{notice.message}</div>
          <button
            onClick={() => dismissNotice(notice.id)}
            className="ml-3 text-black/40 hover:text-black/80 dark:text-white/40 dark:hover:text-white/80 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  );
}

function App() {
  const { masterPassword, vaultStatus, refreshVaultStatus } = useApp();

  useEffect(() => {
    if (!vaultStatus) {
      void refreshVaultStatus();
    }
  }, [vaultStatus, refreshVaultStatus]);

  if (!vaultStatus) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--color-bg)]">
        <NoticeStack />
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-[var(--color-primary)]" />
          <div className="text-gray-500 font-medium">LaoChenDNS 正在加载...</div>
        </div>
      </div>
    );
  }

  if (!vaultStatus.initialized) {
    return (
      <div className="min-h-screen bg-[var(--color-bg)]">
        <NoticeStack />
        <Routes>
          <Route path="*" element={<SetupPage />} />
        </Routes>
      </div>
    );
  }

  if (!masterPassword) {
    return (
      <div className="min-h-screen bg-[var(--color-bg)]">
        <NoticeStack />
        <Routes>
          <Route path="*" element={<UnlockPage />} />
        </Routes>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--color-bg)]">
      <NoticeStack />
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Navigate to="/domains" replace />} />
          <Route path="/domains" element={<DomainsPage />} />
          <Route path="/smart-resolve" element={<SmartResolvePage />} />
          <Route path="/records/:provider/:domainId" element={<RecordsPage />} />
          <Route path="/integrations" element={<IntegrationsPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="*" element={<Navigate to="/domains" replace />} />
        </Route>
      </Routes>
    </div>
  );
}

export default App;
