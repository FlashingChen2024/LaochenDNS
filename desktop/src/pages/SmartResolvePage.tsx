import { useEffect, useMemo, useState } from "react";
import { Search, CheckCircle2, AlertCircle, Wand2 } from "lucide-react";
import { useApp } from "../app/AppContext";
import { Button } from "../components/Button";
import { Input } from "../components/Input";
import { Card, CardHeader, CardTitle, CardContent } from "../components/Card";
import { Dropdown, type DropdownOption } from "../components/Dropdown";
import {
  createRecord,
  listDomains,
  listRecords,
  resolveErrorMessage,
  type DomainItem,
  type RecordCreateRequest,
} from "../lib/api";

const RECORD_TYPES = ["A", "AAAA", "CNAME", "TXT", "MX", "NS", "SRV", "CAA"] as const;
const DOMAINS_CACHE_PREFIX = "laochen_dns_domains_cache_v1";

const RECORD_CONTENT_PLACEHOLDER: Record<(typeof RECORD_TYPES)[number], string> = {
  A: "例如 1.2.3.4",
  AAAA: "例如 2408:4005:2000:1::1",
  CNAME: "例如 target.example.com",
  TXT: "例如 v=spf1 include:example.com ~all",
  MX: "例如 mail.example.com",
  NS: "例如 ns1.example.com",
  SRV: "例如 target.example.com",
  CAA: "例如 letsencrypt.org",
};

const STATUS_TEXT: Record<DomainItem["status"], string> = {
  ok: "正常",
  auth_failed: "鉴权失败",
  unreachable: "不可达",
  fetch_failed: "拉取失败",
  not_configured: "未配置",
};

type DomainMatch = {
  domain: DomainItem;
  rootDomain: string;
  hostName: string;
};

function normalizeDomain(input: string) {
  return input.trim().toLowerCase().replace(/\.$/, "");
}

function findDomainMatch(fullDomain: string, domains: DomainItem[]): DomainMatch | null {
  const normalized = normalizeDomain(fullDomain);
  const candidates = domains
    .filter((d) => d.name)
    .map((d) => ({ ...d, normalized: d.name.toLowerCase() }))
    .sort((a, b) => b.normalized.length - a.normalized.length);

  for (const domain of candidates) {
    if (normalized === domain.normalized) {
      return { domain, rootDomain: domain.normalized, hostName: "@" };
    }
    if (normalized.endsWith(`.${domain.normalized}`)) {
      const hostName = normalized.slice(0, normalized.length - domain.normalized.length - 1);
      return { domain, rootDomain: domain.normalized, hostName };
    }
  }
  return null;
}

function buildDomainsCacheKey() {
  return `${DOMAINS_CACHE_PREFIX}:all:`;
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

export function SmartResolvePage() {
  const { masterPassword, notifyError, notifySuccess } = useApp();
  const [domainInput, setDomainInput] = useState("");
  const [domains, setDomains] = useState<DomainItem[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [step, setStep] = useState<"input" | "config">("input");
  const [matchedDomain, setMatchedDomain] = useState<DomainMatch | null>(null);

  const [recordType, setRecordType] = useState<(typeof RECORD_TYPES)[number]>("A");
  const [content, setContent] = useState("");
  const [ttl, setTtl] = useState(600);
  const [mxPriority, setMxPriority] = useState(10);
  const [srvPriority, setSrvPriority] = useState(10);
  const [srvWeight, setSrvWeight] = useState(5);
  const [srvPort, setSrvPort] = useState(443);
  const [caaFlags, setCaaFlags] = useState(0);
  const [caaTag, setCaaTag] = useState("issue");
  const recordTypeOptions = useMemo<DropdownOption<(typeof RECORD_TYPES)[number]>[]>(
    () => RECORD_TYPES.map((type) => ({ value: type, label: type })),
    [],
  );

  const loadDomains = async () => {
    if (!masterPassword) return;
    const cacheKey = buildDomainsCacheKey();
    const cached = readDomainsCache(cacheKey);
    if (cached) {
      setDomains(cached.filter((d) => d.provider_id));
    }
    setError(null);
    try {
      const data = await listDomains(masterPassword, null, "");
      const filtered = data.filter((d) => d.provider_id);
      const current = cached ?? domains;
      if (!areDomainsEqual(filtered, current)) {
        setDomains(filtered);
      }
      writeDomainsCache(cacheKey, filtered);
    } catch (e) {
      const message = resolveErrorMessage(e);
      setError(message);
      notifyError(message);
    }
  };

  useEffect(() => {
    void loadDomains();
  }, [masterPassword]);

  const validateDomain = async () => {
    if (!masterPassword) return;
    setError(null);
    setSuccess(null);
    const normalized = normalizeDomain(domainInput);
    if (!normalized || !normalized.includes(".")) {
      setError("请输入完整域名，例如 webtest.chenyuxia.com");
      return;
    }
    if (domains.length === 0) {
      setError("尚未检测到可用域名，请先在“接入”页配置并刷新域名列表");
      return;
    }
    const match = findDomainMatch(normalized, domains);
    if (!match) {
      setError("根域名不在已配置的域名列表中");
      return;
    }
    if (match.domain.status !== "ok") {
      setError(`域名当前不可用：${STATUS_TEXT[match.domain.status]}`);
      return;
    }
    setBusy(true);
    try {
      const records = await listRecords(
        masterPassword,
        match.domain.provider,
        match.domain.provider_id,
        match.domain.name,
      );
      const hostLower = match.hostName.toLowerCase();
      const exists = records.some((r) => r.name.toLowerCase() === hostLower);
      if (exists) {
        setError("该主机名已存在记录，避免重复添加");
        return;
      }
      setMatchedDomain(match);
      setStep("config");
      setRecordType("A");
      setContent("");
      setTtl(600);
      setMxPriority(10);
      setSrvPriority(10);
      setSrvWeight(5);
      setSrvPort(443);
      setCaaFlags(0);
      setCaaTag("issue");
    } catch (e) {
      const message = resolveErrorMessage(e);
      setError(message);
      notifyError(message);
    } finally {
      setBusy(false);
    }
  };

  const validateRecord = () => {
    const trimmedContent = content.trim();
    if (!trimmedContent) return "记录值不能为空";
    if (ttl < 60 || ttl > 86400) return "TTL 必须在 60-86400 秒之间";
    if (recordType === "A") {
      const ipv4Regex =
        /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
      if (!ipv4Regex.test(trimmedContent)) return "A 记录必须是有效的 IPv4 地址";
    }
    if (recordType === "AAAA") {
      const ipv6Regex = /^[0-9a-fA-F:]+$/;
      if (!ipv6Regex.test(trimmedContent) || !trimmedContent.includes(":")) return "AAAA 记录必须是有效的 IPv6 地址";
    }
    if (recordType === "CNAME" || recordType === "NS" || recordType === "MX" || recordType === "SRV") {
      if (!trimmedContent.includes(".")) return "记录值必须是有效域名";
    }
    if (recordType === "MX") {
      if (mxPriority < 0 || mxPriority > 65535) return "MX 优先级必须在 0-65535 之间";
    }
    if (recordType === "SRV") {
      if (srvPriority < 0 || srvPriority > 65535) return "SRV 优先级必须在 0-65535 之间";
      if (srvWeight < 0 || srvWeight > 65535) return "SRV 权重必须在 0-65535 之间";
      if (srvPort < 1 || srvPort > 65535) return "SRV 端口必须在 1-65535 之间";
    }
    if (recordType === "CAA") {
      if (caaFlags < 0 || caaFlags > 255) return "CAA Flags 必须在 0-255 之间";
      if (!caaTag.trim()) return "CAA Tag 不能为空";
    }
    return null;
  };

  const submitRecord = async () => {
    if (!masterPassword || !matchedDomain) return;
    setError(null);
    setSuccess(null);
    const validationError = validateRecord();
    if (validationError) {
      setError(validationError);
      return;
    }
    setBusy(true);
    try {
      const request: RecordCreateRequest = {
        record_type: recordType,
        name: matchedDomain.hostName,
        content: content.trim(),
        ttl,
        conflict_strategy: "do_not_create",
        mx_priority: recordType === "MX" ? mxPriority : null,
        srv_priority: recordType === "SRV" ? srvPriority : null,
        srv_weight: recordType === "SRV" ? srvWeight : null,
        srv_port: recordType === "SRV" ? srvPort : null,
        caa_flags: recordType === "CAA" ? caaFlags : null,
        caa_tag: recordType === "CAA" ? caaTag.trim() : null,
      };
      await createRecord(
        masterPassword,
        matchedDomain.domain.provider,
        matchedDomain.domain.provider_id,
        matchedDomain.domain.name,
        request,
      );
      notifySuccess("智能解析记录创建成功");
      setSuccess("记录已成功添加，可继续配置其他类型记录");
      setContent("");
    } catch (e) {
      const message = resolveErrorMessage(e);
      setError(message);
      notifyError(message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col gap-2 border-b border-[var(--color-border)] pb-6">
        <h1 className="text-4xl font-bold tracking-tight uppercase text-[var(--color-accent)] leading-none">智能解析</h1>
        <p className="text-sm font-medium text-[var(--color-text-secondary)] tracking-wide uppercase">
          输入完整域名，自动匹配并配置
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Step 1: Input */}
        <Card className={step === "config" ? "opacity-50 pointer-events-none" : ""}>
          <CardHeader className="border-b border-[var(--color-border)] p-6">
            <div className="flex items-center gap-2">
              <div className="bg-[var(--color-primary)] text-white w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold">1</div>
              <CardTitle>输入目标域名</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
             <div className="space-y-2">
               <Input
                placeholder="例如 www.example.com"
                value={domainInput}
                onChange={(e) => setDomainInput(e.target.value)}
                autoFocus
                icon={<Search className="w-4 h-4" />}
                onKeyDown={(e) => {
                  if (e.key === "Enter") void validateDomain();
                }}
              />
              <Button onClick={() => void validateDomain()} disabled={busy} loading={busy} className="w-full">
                <Wand2 className="w-4 h-4 mr-2" />
                智能识别
              </Button>
             </div>
             
             {error && (
              <div className="bg-red-50 text-red-600 p-4 border border-red-200 text-sm font-medium flex items-start gap-2">
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                {error}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Step 2: Config */}
        <Card className={step === "input" ? "opacity-50 pointer-events-none" : ""}>
          <CardHeader className="border-b border-[var(--color-border)] p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="bg-[var(--color-primary)] text-white w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold">2</div>
                <CardTitle>配置解析记录</CardTitle>
              </div>
              {step === "config" && (
                <Button variant="ghost" size="sm" onClick={() => {
                  setStep("input");
                  setMatchedDomain(null);
                  setError(null);
                  setSuccess(null);
                }} className="text-xs uppercase tracking-wide">
                  重置
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            {step === "config" && matchedDomain ? (
              <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                <div className="bg-blue-50 text-blue-700 p-4 border border-blue-200 text-sm">
                  <p className="flex justify-between"><span className="font-bold uppercase text-xs tracking-wider">已识别根域名:</span> <span className="font-mono">{matchedDomain.rootDomain}</span></p>
                  <p className="flex justify-between mt-1"><span className="font-bold uppercase text-xs tracking-wider">即将添加主机名:</span> <span className="font-mono">{matchedDomain.hostName}</span></p>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-[var(--color-text-secondary)] uppercase tracking-wider">记录类型</label>
                    <Dropdown
                      value={recordType}
                      options={recordTypeOptions}
                      onChange={setRecordType}
                      className="w-full"
                    />
                  </div>
                  <Input
                    label="TTL (秒)"
                    type="number"
                    value={ttl}
                    onChange={(e) => setTtl(Number(e.target.value))}
                  />
                </div>

                <div className="space-y-1.5">
                   <label className="text-xs font-bold text-[var(--color-text-secondary)] uppercase tracking-wider">记录值</label>
                   <textarea
                     className="w-full h-24 p-4 rounded-none bg-[var(--color-surface)] border border-[var(--color-border)] focus:outline-none focus:border-[var(--color-primary)] text-sm resize-none font-mono"
                     value={content}
                     onChange={(e) => setContent(e.target.value)}
                     placeholder={RECORD_CONTENT_PLACEHOLDER[recordType]}
                   />
                </div>

                 {recordType === "MX" && (
                  <Input
                    label="优先级"
                    type="number"
                    value={mxPriority}
                    onChange={(e) => setMxPriority(Number(e.target.value))}
                  />
                )}

                {recordType === "SRV" && (
                  <div className="grid grid-cols-3 gap-4">
                    <Input
                      label="优先级"
                      type="number"
                      value={srvPriority}
                      onChange={(e) => setSrvPriority(Number(e.target.value))}
                    />
                    <Input
                      label="权重"
                      type="number"
                      value={srvWeight}
                      onChange={(e) => setSrvWeight(Number(e.target.value))}
                    />
                    <Input
                      label="端口"
                      type="number"
                      value={srvPort}
                      onChange={(e) => setSrvPort(Number(e.target.value))}
                    />
                  </div>
                )}

                {recordType === "CAA" && (
                  <div className="grid grid-cols-2 gap-4">
                    <Input
                      label="Flags"
                      type="number"
                      value={caaFlags}
                      onChange={(e) => setCaaFlags(Number(e.target.value))}
                    />
                    <Input
                      label="Tag"
                      value={caaTag}
                      onChange={(e) => setCaaTag(e.target.value)}
                    />
                  </div>
                )}

                {success && (
                  <div className="bg-green-50 text-green-700 p-4 border border-green-200 text-sm font-medium flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />
                    {success}
                  </div>
                )}

                <Button className="w-full" onClick={() => void submitRecord()} loading={busy}>
                  确认添加
                </Button>
              </div>
            ) : (
              <div className="text-center text-[var(--color-text-secondary)] py-12 uppercase tracking-wide text-xs">
                请先完成第一步
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
