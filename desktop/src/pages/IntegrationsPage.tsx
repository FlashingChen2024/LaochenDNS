import { useEffect, useMemo, useState } from "react";
import { useApp } from "../app/AppContext";
import {
  clearCloudflare,
  clearDnspod,
  getIntegrations,
  saveCloudflare,
  saveDnspod,
  testCloudflare,
  testDnspod,
  type IntegrationsInfo,
  type IntegrationTestResult,
} from "../lib/api";

export function IntegrationsPage() {
  const { masterPassword } = useApp();
  const [data, setData] = useState<IntegrationsInfo | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [cfEmail, setCfEmail] = useState("");
  const [cfApiKey, setCfApiKey] = useState("");
  const [cfTest, setCfTest] = useState<IntegrationTestResult | null>(null);

  const [dpTokenId, setDpTokenId] = useState("");
  const [dpToken, setDpToken] = useState("");
  const [dpTest, setDpTest] = useState<IntegrationTestResult | null>(null);

  const load = async () => {
    if (!masterPassword) return;
    setError(null);
    try {
      const v = await getIntegrations(masterPassword);
      setData(v);
    } catch (e) {
      setError(String(e));
    }
  };

  useEffect(() => {
    void load();
  }, [masterPassword]);

  const cfStatusText = useMemo(() => {
    if (!data) return "加载中";
    if (!data.cloudflare.configured) return "未配置";
    if (data.cloudflare.last_verified_at) return `已配置（上次校验：${data.cloudflare.last_verified_at}）`;
    return "已配置";
  }, [data]);

  const dpStatusText = useMemo(() => {
    if (!data) return "加载中";
    if (!data.dnspod.configured) return "未配置";
    if (data.dnspod.last_verified_at) return `已配置（上次校验：${data.dnspod.last_verified_at}）`;
    return "已配置";
  }, [data]);

  const onCfTest = async () => {
    setCfTest(null);
    try {
      const r = await testCloudflare(cfEmail, cfApiKey);
      setCfTest(r);
    } catch (e) {
      setCfTest({ ok: false, message: String(e) });
    }
  };

  const onDpTest = async () => {
    setDpTest(null);
    try {
      const r = await testDnspod(dpTokenId, dpToken);
      setDpTest(r);
    } catch (e) {
      setDpTest({ ok: false, message: String(e) });
    }
  };

  const onCfSave = async () => {
    if (!masterPassword) return;
    setBusy(true);
    setError(null);
    try {
      await saveCloudflare(masterPassword, cfEmail, cfApiKey);
      setCfApiKey("");
      await load();
    } catch (e) {
      setError(String(e));
    } finally {
      setBusy(false);
    }
  };

  const onDpSave = async () => {
    if (!masterPassword) return;
    setBusy(true);
    setError(null);
    try {
      await saveDnspod(masterPassword, dpTokenId, dpToken);
      setDpToken("");
      await load();
    } catch (e) {
      setError(String(e));
    } finally {
      setBusy(false);
    }
  };

  const onCfClear = async () => {
    if (!masterPassword) return;
    setBusy(true);
    setError(null);
    try {
      await clearCloudflare(masterPassword);
      await load();
    } catch (e) {
      setError(String(e));
    } finally {
      setBusy(false);
    }
  };

  const onDpClear = async () => {
    if (!masterPassword) return;
    setBusy(true);
    setError(null);
    try {
      await clearDnspod(masterPassword);
      await load();
    } catch (e) {
      setError(String(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">厂商接入</div>
          <div className="muted">配置 Cloudflare / DNSPod 凭据并进行鉴权校验</div>
        </div>
        <button className="btn btn-secondary" onClick={() => void load()} disabled={busy}>
          刷新
        </button>
      </div>

      {error ? <div className="error">{error}</div> : null}

      <div className="grid-2" style={{ marginTop: 16 }}>
        <div className="card">
          <div className="row" style={{ justifyContent: "space-between" }}>
            <div>
              <div className="h1">Cloudflare</div>
              <div className="muted">{cfStatusText}</div>
            </div>
            <button className="btn btn-danger" onClick={() => void onCfClear()} disabled={busy || !data?.cloudflare.configured}>
              清除
            </button>
          </div>

          <div className="form">
            <label className="label">
              账号邮箱
              <input className="input" value={cfEmail} onChange={(e) => setCfEmail(e.target.value)} />
            </label>
            <label className="label">
              Global API Key
              <input className="input" type="password" value={cfApiKey} onChange={(e) => setCfApiKey(e.target.value)} />
            </label>
            {cfTest ? <div className={cfTest.ok ? "success" : "error"}>{cfTest.message}</div> : null}
            <div className="row">
              <button className="btn btn-secondary" type="button" onClick={() => void onCfTest()} disabled={busy}>
                测试连接
              </button>
              <button className="btn btn-primary" type="button" onClick={() => void onCfSave()} disabled={busy}>
                保存
              </button>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="row" style={{ justifyContent: "space-between" }}>
            <div>
              <div className="h1">DNSPod</div>
              <div className="muted">{dpStatusText}</div>
            </div>
            <button className="btn btn-danger" onClick={() => void onDpClear()} disabled={busy || !data?.dnspod.configured}>
              清除
            </button>
          </div>

          <div className="form">
            <label className="label">
              Token ID
              <input className="input" value={dpTokenId} onChange={(e) => setDpTokenId(e.target.value)} />
            </label>
            <label className="label">
              Token
              <input className="input" type="password" value={dpToken} onChange={(e) => setDpToken(e.target.value)} />
            </label>
            {dpTest ? <div className={dpTest.ok ? "success" : "error"}>{dpTest.message}</div> : null}
            <div className="row">
              <button className="btn btn-secondary" type="button" onClick={() => void onDpTest()} disabled={busy}>
                测试连接
              </button>
              <button className="btn btn-primary" type="button" onClick={() => void onDpSave()} disabled={busy}>
                保存
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
