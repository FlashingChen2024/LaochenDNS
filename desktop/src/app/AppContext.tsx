import React, { createContext, useCallback, useContext, useMemo, useState } from "react";
import { getVaultStatus, type VaultStatus } from "../lib/api";

type AppContextValue = {
  masterPassword: string | null;
  setMasterPassword: (value: string | null) => void;
  vaultStatus: VaultStatus | null;
  refreshVaultStatus: () => Promise<void>;
};

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [masterPassword, setMasterPassword] = useState<string | null>(null);
  const [vaultStatus, setVaultStatus] = useState<VaultStatus | null>(null);

  const refreshVaultStatus = useCallback(async () => {
    const status = await getVaultStatus();
    setVaultStatus(status);
  }, []);

  const value = useMemo<AppContextValue>(
    () => ({ masterPassword, setMasterPassword, vaultStatus, refreshVaultStatus }),
    [masterPassword, vaultStatus, refreshVaultStatus],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("AppContext not found");
  return ctx;
}

