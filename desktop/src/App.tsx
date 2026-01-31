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

function App() {
  const { masterPassword, vaultStatus, refreshVaultStatus } = useApp();

  useEffect(() => {
    if (!vaultStatus) {
      void refreshVaultStatus();
    }
  }, [vaultStatus, refreshVaultStatus]);

  if (!vaultStatus) {
    return (
      <div className="center">
        <div className="card w-520">
          <div className="h1">LaoChenDNS</div>
          <div className="muted">正在加载…</div>
        </div>
      </div>
    );
  }

  if (!vaultStatus.initialized) {
    return (
      <Routes>
        <Route path="*" element={<SetupPage />} />
      </Routes>
    );
  }

  if (!masterPassword) {
    return (
      <Routes>
        <Route path="*" element={<UnlockPage />} />
      </Routes>
    );
  }

  return (
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
  );
}

export default App;
