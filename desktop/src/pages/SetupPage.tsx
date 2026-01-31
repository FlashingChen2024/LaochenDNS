import React, { useMemo, useState } from "react";
import { initializeVault } from "../lib/api";
import { useApp } from "../app/AppContext";

export function SetupPage() {
  const { refreshVaultStatus, setMasterPassword } = useApp();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = useMemo(() => {
    if (busy) return false;
    if (password.length < 8) return false;
    if (password !== confirm) return false;
    return true;
  }, [busy, password, confirm]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await initializeVault(password);
      setMasterPassword(password);
      await refreshVaultStatus();
    } catch (e) {
      setError(String(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="center">
      <div className="card w-520">
        <h1 className="h1">设置主密码</h1>
        <p className="muted">
          主密码用于本地加密保存 Cloudflare Global API Key 与 DNSPod Token，不会上传到云端。
        </p>
        <form onSubmit={onSubmit} className="form">
          <label className="label">
            主密码（至少 8 位）
            <input
              className="input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoFocus
            />
          </label>
          <label className="label">
            确认主密码
            <input
              className="input"
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
            />
          </label>
          {error ? <div className="error">{error}</div> : null}
          <button className="btn btn-primary" type="submit" disabled={!canSubmit}>
            开始使用
          </button>
        </form>
      </div>
    </div>
  );
}

