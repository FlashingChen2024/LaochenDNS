import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, RefreshCw, Cloud, Server } from "lucide-react";
import { useApp } from "../app/AppContext";
import { Dropdown, type DropdownOption } from "../components/Dropdown";
import { Button } from "../components/Button";
import { Input } from "../components/Input";
import { Badge } from "../components/Badge";
import { Card } from "../components/Card";
import { listDomains, resolveErrorMessage, type DomainItem, type Provider } from "../lib/api";

const DOMAINS_CACHE_PREFIX = "laochen_dns_domains_cache_v1";

function StatusBadge({ status }: { status: DomainItem["status"] }) {
  switch (status) {
    case "ok":
      return <Badge variant="success">正常</Badge>;
    case "auth_failed":
      return <Badge variant="destructive">鉴权失败</Badge>;
    case "unreachable":
      return <Badge variant="destructive">不可达</Badge>;
    case "fetch_failed":
      return <Badge variant="destructive">拉取失败</Badge>;
    case "not_configured":
      return <Badge variant="warning">未配置</Badge>;
    default:
      return <Badge variant="secondary">未知</Badge>;
  }
}

function ProviderIcon({ provider }: { provider: Provider }) {
  return provider === "cloudflare" ? (
    <div className="flex items-center gap-2">
      <Cloud className="w-4 h-4 text-[#F38020]" />
      <span>Cloudflare</span>
    </div>
  ) : (
    <div className="flex items-center gap-2">
      <Server className="w-4 h-4 text-[#D6204B]" />
      <span>DNSPod</span>
    </div>
  );
}

function buildDomainsCacheKey(provider: Provider | "all", search: string) {
  const normalized = search.trim().toLowerCase();
  return `${DOMAINS_CACHE_PREFIX}:${provider}:${encodeURIComponent(normalized)}`;
}

function normalizeDomains(rows: DomainItem[]) {
  return [...rows].sort((a, b) => {
    const left = `${a.provider}:${a.provider_id}`;
    const right = `${b.provider}:${b.provider_id}`;
    return left.localeCompare(right);
  });
}

function areDomainsEqual(a: DomainItem[], b: DomainItem[]) {
  return JSON.stringify(normalizeDomains(a)) === JSON.stringify(normalizeDomains(b));
}

function readDomainsCache(cacheKey: string) {
  try {
    const raw = localStorage.getItem(cacheKey);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { rows?: DomainItem[] };
    if (!parsed || !Array.isArray(parsed.rows)) return null;
    return parsed.rows;
  } catch {
    return null;
  }
}

function writeDomainsCache(cacheKey: string, rows: DomainItem[]) {
  try {
    localStorage.setItem(cacheKey, JSON.stringify({ updatedAt: Date.now(), rows }));
  } catch {
    return;
  }
}

export function DomainsPage() {
  const { masterPassword, notifyError } = useApp();
  const navigate = useNavigate();
  const [provider, setProvider] = useState<Provider | "all">("all");
  const [search, setSearch] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<DomainItem[]>([]);
  
  const providerOptions = useMemo<DropdownOption<Provider | "all">[]>(
    () => [
      { value: "all", label: "全部厂商" },
      { value: "cloudflare", label: "Cloudflare" },
      { value: "dnspod", label: "DNSPod" },
    ],
    [],
  );

  const load = async (useCache = false) => {
    if (!masterPassword) return;
    const cacheKey = buildDomainsCacheKey(provider, search);
    if (useCache) {
      const cached = readDomainsCache(cacheKey);
      if (cached) {
        setRows(cached);
      }
    }
    setBusy(true);
    setError(null);
    try {
      const data = await listDomains(masterPassword, provider === "all" ? null : provider, search);
      const cached = readDomainsCache(cacheKey) ?? rows;
      if (!areDomainsEqual(data, cached)) {
        setRows(data);
      }
      writeDomainsCache(cacheKey, data);
    } catch (e) {
      const message = resolveErrorMessage(e);
      setError(message);
      notifyError(message);
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    void load(true);
  }, [masterPassword]);

  const filteredRows = useMemo(() => {
    return rows.filter((r) => r.provider_id);
  }, [rows]);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-[var(--color-border)] pb-6">
        <div>
          <h1 className="text-4xl font-bold tracking-tight uppercase text-[var(--color-accent)] leading-none">域名资产</h1>
          <p className="text-sm font-medium text-[var(--color-text-secondary)] mt-2 tracking-wide uppercase">
            Cloudflare / DNSPod 资产管理
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Input
            placeholder="搜索域名..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full md:w-60"
            icon={<Search className="w-4 h-4" />}
          />
          <Dropdown 
            value={provider} 
            options={providerOptions} 
            onChange={setProvider} 
            className="w-40"
          />
          <Button 
            variant="outline" 
            onClick={() => void load()} 
            loading={busy}
            size="icon"
            className="border-[var(--color-border)] hover:bg-[var(--color-primary)] hover:text-white hover:border-[var(--color-primary)]"
          >
            <RefreshCw className={busy ? "animate-spin" : ""} />
          </Button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 p-4 border border-red-200 text-sm font-medium">
          {error}
        </div>
      )}

      {/* Grid List */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {filteredRows.map((d) => (
          <Card 
            key={`${d.provider}:${d.provider_id}`}
            className="group cursor-pointer hover:border-[var(--color-primary)] transition-colors duration-200"
            onClick={() =>
              navigate(`/records/${d.provider}/${encodeURIComponent(d.provider_id)}?name=${encodeURIComponent(d.name)}`)
            }
          >
            <div className="p-6 space-y-4">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <h3 className="text-xl font-bold text-[var(--color-accent)] group-hover:text-[var(--color-primary)] transition-colors break-all">
                    {d.name}
                  </h3>
                  <div className="flex items-center gap-2 text-xs font-bold text-[var(--color-text-secondary)] uppercase tracking-wider">
                    <ProviderIcon provider={d.provider} />
                  </div>
                </div>
                <StatusBadge status={d.status} />
              </div>
              
              <div className="grid grid-cols-2 gap-4 py-4 border-t border-[var(--color-border)] border-dashed">
                <div>
                  <div className="text-[10px] uppercase tracking-widest text-[var(--color-text-secondary)] font-bold mb-1">记录数</div>
                  <div className="text-2xl font-bold text-[var(--color-text)] font-mono">{d.records_count ?? "-"}</div>
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-widest text-[var(--color-text-secondary)] font-bold mb-1">最后更新</div>
                  <div className="text-xs font-bold text-[var(--color-text)] mt-1.5">{d.last_changed_at ?? "-"}</div>
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {filteredRows.length === 0 && !busy && (
        <div className="py-24 text-center border border-dashed border-[var(--color-border)] bg-[var(--color-surface)]">
          <div className="flex flex-col items-center gap-4">
            <div className="w-16 h-16 bg-[var(--color-bg)] rounded-full flex items-center justify-center">
              <Search className="w-8 h-8 text-[var(--color-text-secondary)]" />
            </div>
            <div className="space-y-1">
              <h3 className="text-lg font-bold text-[var(--color-accent)] uppercase">未找到域名</h3>
              <p className="text-sm text-[var(--color-text-secondary)]">请在服务接入页配置凭据，或尝试其他搜索关键词。</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
