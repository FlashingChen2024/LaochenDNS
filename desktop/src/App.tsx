import { useEffect } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { useApp } from "./app/AppContext";
import { Layout } from "./app/Layout";
import { DomainsPage } from "./pages/DomainsPage";
import { IntegrationsPage } from "./pages/IntegrationsPage";
import { RecordsPage } from "./pages/RecordsPage";
import { SettingsPage } from "./pages/SettingsPage";
import { SetupPage } from "./pages/SetupPage";
import { UnlockPage } from "./pages/UnlockPage";

function NoticeStack() {
  const { notices, dismissNotice } = useApp();

  if (notices.length === 0) return null;

  return (
    <div className="notice-stack">
      {notices.map((notice) => (
        <div
          key={notice.id}
          className={notice.type === "success" ? "notice notice-success" : "notice notice-error"}
        >
          <div className="notice-text">{notice.message}</div>
          <button className="btn btn-secondary notice-close" onClick={() => dismissNotice(notice.id)}>
            关闭
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
      <div className="app-root">
        <NoticeStack />
        <div className="center">
          <div className="card w-520">
            <div className="h1">LaoChenDNS</div>
            <div className="muted">正在加载…</div>
          </div>
        </div>
      </div>
    );
  }

  if (!vaultStatus.initialized) {
    return (
      <div className="app-root">
        <NoticeStack />
        <Routes>
          <Route path="*" element={<SetupPage />} />
        </Routes>
      </div>
    );
  }

  if (!masterPassword) {
    return (
      <div className="app-root">
        <NoticeStack />
        <Routes>
          <Route path="*" element={<UnlockPage />} />
        </Routes>
      </div>
    );
  }

  return (
    <div className="app-root">
      <NoticeStack />
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Navigate to="/domains" replace />} />
          <Route path="/domains" element={<DomainsPage />} />
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
