import React, { useMemo, useState } from "react";
import { Lock } from "lucide-react";
import { initializeVault, resolveErrorMessage } from "../lib/api";
import { useApp } from "../app/AppContext";
import { Card, CardHeader, CardTitle, CardContent } from "../components/Card";
import { Input } from "../components/Input";
import { Button } from "../components/Button";

export function SetupPage() {
  const { refreshVaultStatus, setMasterPassword, notifyError, notifySuccess } = useApp();
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
      notifySuccess("主密码已设置");
    } catch (e) {
      const message = resolveErrorMessage(e);
      setError(message);
      notifyError(message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--color-bg)] p-4">
      <div className="w-full max-w-md animate-in zoom-in-95 duration-500">
        <Card className="border-[var(--color-border)] shadow-xl">
          <CardHeader className="text-center space-y-2 border-b border-[var(--color-border)] p-6 bg-[var(--color-surface)]">
            <CardTitle className="text-xl uppercase tracking-widest">初始化保险库</CardTitle>
            <p className="text-xs font-medium text-[var(--color-text-secondary)] uppercase tracking-wide leading-relaxed">
              请设置主密码以加密存储您的 API 凭据
            </p>
          </CardHeader>
          <CardContent className="p-6">
            <form onSubmit={onSubmit} className="space-y-6">
              <Input
                label="主密码 (至少8位)"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoFocus
                icon={<Lock className="w-4 h-4" />}
                className="font-mono tracking-widest"
              />
              <Input
                label="确认密码"
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                icon={<Lock className="w-4 h-4" />}
                error={confirm && password !== confirm ? "两次输入的密码不一致" : undefined}
                className="font-mono tracking-widest"
              />
              
              {error && (
                <div className="text-xs font-bold text-red-600 bg-red-50 p-4 border border-red-200 flex items-center gap-2 uppercase tracking-wide">
                  <div className="w-2 h-2 bg-red-600 rounded-full" />
                  {error}
                </div>
              )}
              
              <Button className="w-full h-12 text-sm uppercase tracking-widest" type="submit" disabled={!canSubmit} loading={busy}>
                初始化
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
