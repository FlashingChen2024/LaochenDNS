import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useApp } from "../app/AppContext";
import { listDomains, type DomainItem, type Provider } from "../lib/api";

function statusPill(status: DomainItem["status"]) {
  switch (status) {
    case "ok":
      return <span className="pill pill-ok">正常</span>;
    case "auth_failed":
      return <span className="pill pill-bad">鉴权失败</span>;
    case "unreachable":
      return <span className="pill pill-bad">不可达</span>;
    case "fetch_failed":
      return <span className="pill pill-bad">拉取失败</span>;
    case "not_configured":
      return <span className="pill pill-warn">未配置</span>;
    default:
      return <span className="pill">未知</span>;
  }
}

function providerLabel(p: Provider) {
  return p === "cloudflare" ? "Cloudflare" : "DNSPod";
}

export function DomainsPage() {
  const { masterPassword } = useApp();
  const navigate = useNavigate();
  const [provider, setProvider] = useState<Provider | "all">("all");
  const [search, setSearch] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<DomainItem[]>([]);

  const load = async () => {
    if (!masterPassword) return;
    setBusy(true);
    setError(null);
    try {
      const data = await listDomains(masterPassword, provider === "all" ? null : provider, search);
      setRows(data);
    } catch (e) {
      setError(String(e));
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    void load();
  }, [masterPassword]);

  const filteredRows = useMemo(() => {
    return rows.filter((r) => r.provider_id);
  }, [rows]);

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">域名</div>
          <div className="muted">聚合展示 Cloudflare / DNSPod 域名列表</div>
        </div>
        <div className="row">
          <input
            className="input"
            placeholder="搜索域名"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ width: 240 }}
          />
          <select className="select" value={provider} onChange={(e) => setProvider(e.target.value as Provider | "all")}>
            <option value="all">全部厂商</option>
            <option value="cloudflare">Cloudflare</option>
            <option value="dnspod">DNSPod</option>
          </select>
          <button className="btn btn-primary" onClick={() => void load()} disabled={busy}>
            刷新
          </button>
        </div>
      </div>

      {error ? <div className="error">{error}</div> : null}

      <table className="table" style={{ marginTop: 12 }}>
        <thead>
          <tr>
            <th style={{ width: "38%" }}>域名</th>
            <th style={{ width: "14%" }}>厂商</th>
            <th style={{ width: "14%" }}>状态</th>
            <th style={{ width: "14%" }}>记录数</th>
            <th style={{ width: "20%" }}>最近变更</th>
          </tr>
        </thead>
        <tbody>
          {filteredRows.map((d) => (
            <tr
              key={`${d.provider}:${d.provider_id}`}
              style={{ cursor: "pointer" }}
              onClick={() =>
                navigate(`/records/${d.provider}/${encodeURIComponent(d.provider_id)}?name=${encodeURIComponent(d.name)}`)
              }
            >
              <td>{d.name}</td>
              <td>{providerLabel(d.provider)}</td>
              <td>{statusPill(d.status)}</td>
              <td>{d.records_count ?? "-"}</td>
              <td>{d.last_changed_at ?? "-"}</td>
            </tr>
          ))}

          {filteredRows.length === 0 ? (
            <tr>
              <td colSpan={5} className="muted">
                暂无数据。请先在“接入”页配置凭据，然后点击“刷新”。
              </td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </div>
  );
}
