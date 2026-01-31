import React, { useMemo, useState } from "react";
import { unlockVault } from "../lib/api";
import { useApp } from "../app/AppContext";

export function UnlockPage() {
  const { setMasterPassword } = useApp();
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = useMemo(() => {
    if (busy) return false;
    if (!password) return false;
    return true;
  }, [busy, password]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await unlockVault(password);
      setMasterPassword(password);
    } catch (e) {
      setError(String(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="center">
      <div className="card w-520">
        <h1 className="h1">解锁 LaoChenDNS</h1>
        <p className="muted">输入主密码以解密本地凭据。</p>
        <form onSubmit={onSubmit} className="form">
          <label className="label">
            主密码
            <input
              className="input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoFocus
            />
          </label>
          {error ? <div className="error">{error}</div> : null}
          <button className="btn btn-primary" type="submit" disabled={!canSubmit}>
            解锁
          </button>
        </form>
      </div>
    </div>
  );
}

