import React, { createContext, useCallback, useContext, useMemo, useState } from "react";
import { getVaultStatus, resolveErrorMessage, type VaultStatus } from "../lib/api";

export type NoticeType = "success" | "error";

export type Notice = {
  id: string;
  type: NoticeType;
  message: string;
};

type AppContextValue = {
  masterPassword: string | null;
  setMasterPassword: (value: string | null) => void;
  vaultStatus: VaultStatus | null;
  refreshVaultStatus: () => Promise<void>;
  notices: Notice[];
  pushNotice: (type: NoticeType, message: string) => void;
  dismissNotice: (id: string) => void;
  notifySuccess: (message: string) => void;
  notifyError: (error: unknown) => void;
};

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [masterPassword, setMasterPassword] = useState<string | null>(null);
  const [vaultStatus, setVaultStatus] = useState<VaultStatus | null>(null);
  const [notices, setNotices] = useState<Notice[]>([]);

  const refreshVaultStatus = useCallback(async () => {
    const status = await getVaultStatus();
    setVaultStatus(status);
  }, []);

  const pushNotice = useCallback((type: NoticeType, message: string) => {
    const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    setNotices([{ id, type, message }]);
  }, []);

  const dismissNotice = useCallback((id: string) => {
    setNotices((prev) => prev.filter((notice) => notice.id !== id));
  }, []);

  const notifySuccess = useCallback(
    (message: string) => {
      pushNotice("success", message);
    },
    [pushNotice],
  );

  const notifyError = useCallback(
    (error: unknown) => {
      pushNotice("error", resolveErrorMessage(error));
    },
    [pushNotice],
  );

  const value = useMemo<AppContextValue>(
    () => ({
      masterPassword,
      setMasterPassword,
      vaultStatus,
      refreshVaultStatus,
      notices,
      pushNotice,
      dismissNotice,
      notifySuccess,
      notifyError,
    }),
    [masterPassword, vaultStatus, refreshVaultStatus, notices, pushNotice, dismissNotice, notifySuccess, notifyError],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("AppContext not found");
  return ctx;
}
