import React, { createContext, useCallback, useContext, useMemo, useState } from "react";
import { getVaultStatus, resolveErrorMessage, type VaultStatus } from "../lib/api";

export type NoticeType = "success" | "error";

export type Notice = {
  id: string;
  type: NoticeType;
  message: string;
};

export type ThemeMode = "light" | "dark";

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
  theme: ThemeMode;
  setTheme: (mode: ThemeMode) => void;
};

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [masterPassword, setMasterPasswordState] = useState<string | null>(null);
  const [vaultStatus, setVaultStatus] = useState<VaultStatus | null>(null);
  const [notices, setNotices] = useState<Notice[]>([]);

  const [theme, setThemeState] = useState<ThemeMode>(() => {
    return (localStorage.getItem("laochen_dns_theme") as ThemeMode) || "light";
  });

  const setTheme = useCallback((mode: ThemeMode) => {
    setThemeState(mode);
    localStorage.setItem("laochen_dns_theme", mode);
    document.documentElement.classList.toggle("dark", mode === "dark");
  }, []);

  // Apply theme on mount
  React.useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, []);

  const setMasterPassword = useCallback((value: string | null) => {
    setMasterPasswordState(value);
  }, []);

  const refreshVaultStatus = useCallback(async () => {
    const status = await getVaultStatus();
    setVaultStatus(status);
  }, []);

  const pushNotice = useCallback((type: NoticeType, message: string) => {
    const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    setNotices((prev) => [{ id, type, message }, ...prev].slice(0, 3));
    setTimeout(() => {
      setNotices((prev) => prev.filter((notice) => notice.id !== id));
    }, 3500);
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
      theme,
      setTheme,
    }),
    [masterPassword, vaultStatus, refreshVaultStatus, notices, pushNotice, dismissNotice, notifySuccess, notifyError, theme, setTheme],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("AppContext not found");
  return ctx;
}
