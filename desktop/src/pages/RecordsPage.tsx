import { useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Plus, RefreshCw, Trash2, Edit2, AlertCircle } from "lucide-react";
import { Modal } from "../components/Modal";
import { Dropdown, type DropdownOption } from "../components/Dropdown";
import { Button } from "../components/Button";
import { Input } from "../components/Input";
import { Card } from "../components/Card";
import { Badge } from "../components/Badge";
import { useApp } from "../app/AppContext";
import {
  createRecord,
  deleteRecord,
  listRecords,
  resolveErrorMessage,
  updateRecord,
  type ConflictStrategy,
  type DnsRecord,
  type Provider,
  type RecordCreateRequest,
  type RecordUpdateRequest,
} from "../lib/api";

const RECORD_TYPES = ["A", "AAAA", "CNAME", "TXT", "MX", "NS", "SRV", "CAA"] as const;
const RECORDS_CACHE_PREFIX = "laochen_dns_records_cache_v1";

function providerLabel(p: Provider) {
  switch (p) {
    case "cloudflare":
      return "Cloudflare";
    case "dnspod":
      return "DNSPod";
    case "aliyun":
      return "阿里云DNS";
    case "huawei":
      return "华为云DNS";
    case "baidu":
      return "百度智能云DNS";
    case "dnscom":
      return "DNS.COM";
    case "rainyun":
      return "雨云DNS";
    case "tencentcloud":
      return "腾讯云DNS";
    default:
      return "未知厂商";
  }
}

function buildRecordsCacheKey(provider: Provider, domainId: string) {
  return `${RECORDS_CACHE_PREFIX}:${provider}:${encodeURIComponent(domainId)}`;
}

function normalizeRecords(rows: DnsRecord[]) {
  return [...rows].sort((a, b) => a.id.localeCompare(b.id));
}

function areRecordsEqual(a: DnsRecord[], b: DnsRecord[]) {
  return JSON.stringify(normalizeRecords(a)) === JSON.stringify(normalizeRecords(b));
}

function readRecordsCache(cacheKey: string) {
  try {
    const raw = localStorage.getItem(cacheKey);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { rows?: DnsRecord[] };
    if (!parsed || !Array.isArray(parsed.rows)) return null;
    return parsed.rows;
  } catch {
    return null;
  }
}

function writeRecordsCache(cacheKey: string, rows: DnsRecord[]) {
  try {
    localStorage.setItem(cacheKey, JSON.stringify({ updatedAt: Date.now(), rows }));
  } catch {
    return;
  }
}

export function RecordsPage() {
  const { masterPassword, notifyError, notifySuccess } = useApp();
  const navigate = useNavigate();
  const params = useParams();
  const [searchParams] = useSearchParams();
  const provider = params.provider as Provider;
  const domainId = params.domainId || "";
  const domainName = searchParams.get("name") || "";

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<DnsRecord[]>([]);
  const [editing, setEditing] = useState<DnsRecord | null>(null);
  const [creating, setCreating] = useState(false);
  const [confirming, setConfirming] = useState<DnsRecord | null>(null);

  const loadWithCache = async () => {
    if (!masterPassword) return;
    const cacheKey = buildRecordsCacheKey(provider, domainId);
    const cached = readRecordsCache(cacheKey);
    if (cached) {
      setRows(cached);
    }
    setBusy(true);
    setError(null);
    try {
      const data = await listRecords(masterPassword, provider, domainId, domainName);
      const current = cached ?? rows;
      if (!areRecordsEqual(data, current)) {
        setRows(data);
      }
      writeRecordsCache(cacheKey, data);
    } catch (e) {
      setError(resolveErrorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const refreshRecords = async () => {
    if (!masterPassword) return;
    const cacheKey = buildRecordsCacheKey(provider, domainId);
    setBusy(true);
    setError(null);
    try {
      const data = await listRecords(masterPassword, provider, domainId, domainName);
      if (!areRecordsEqual(data, rows)) {
        setRows(data);
      }
      writeRecordsCache(cacheKey, data);
    } catch (e) {
      setError(resolveErrorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    void loadWithCache();
  }, [masterPassword, provider, domainId, domainName]);

  const title = useMemo(() => {
    if (!domainName) return "解析记录";
    return `${domainName}`;
  }, [domainName]);

  const onDelete = async (r: DnsRecord) => {
    if (!masterPassword) return;
    setConfirming(null);
    setBusy(true);
    setError(null);
    try {
      await deleteRecord(masterPassword, provider, domainId, domainName, r.id);
      notifySuccess("记录删除成功");
      await refreshRecords();
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
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-[var(--color-border)] pb-6">
        <div>
          <div className="flex items-center gap-4 mb-2">
            <Button variant="ghost" size="icon" onClick={() => navigate("/domains")} className="h-8 w-8 hover:bg-[var(--color-text)] hover:text-white">
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="text-4xl font-bold tracking-tight uppercase text-[var(--color-accent)] leading-none">{title}</h1>
          </div>
          <div className="flex items-center gap-3 ml-12">
            <Badge variant="secondary" className="text-xs tracking-wider">{providerLabel(provider)}</Badge>
            <p className="text-sm font-medium text-[var(--color-text-secondary)] uppercase tracking-wide">
              DNS 解析管理
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={() => void refreshRecords()} loading={busy} className="border-[var(--color-border)] hover:bg-[var(--color-primary)] hover:text-white hover:border-[var(--color-primary)]">
            <RefreshCw className="w-4 h-4 mr-2" />
            刷新
          </Button>
          <Button onClick={() => setCreating(true)} disabled={busy} className="bg-[var(--color-primary)] text-white hover:bg-black">
            <Plus className="w-4 h-4 mr-2" />
            新增记录
          </Button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 p-4 border border-red-200 text-sm font-medium flex items-center gap-2">
          <AlertCircle className="w-4 h-4" />
          {error}
        </div>
      )}

      {/* Table */}
      <Card className="border border-[var(--color-border)] shadow-none rounded-none">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-[var(--color-bg)] border-b border-[var(--color-border)]">
              <tr>
                <th className="px-6 py-4 font-bold text-[var(--color-text-secondary)] uppercase tracking-wider w-[100px] text-xs">类型</th>
                <th className="px-6 py-4 font-bold text-[var(--color-text-secondary)] uppercase tracking-wider w-[200px] text-xs">主机记录</th>
                <th className="px-6 py-4 font-bold text-[var(--color-text-secondary)] uppercase tracking-wider text-xs">记录值</th>
                <th className="px-6 py-4 font-bold text-[var(--color-text-secondary)] uppercase tracking-wider w-[100px] text-xs">TTL</th>
                <th className="px-6 py-4 font-bold text-[var(--color-text-secondary)] uppercase tracking-wider w-[150px] text-right text-xs">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border)] bg-[var(--color-surface)]">
              {rows.map((r) => (
                <tr key={r.id} className="hover:bg-[var(--color-bg)] transition-colors group">
                  <td className="px-6 py-4">
                    <Badge variant="outline" className="font-mono font-bold border-[var(--color-text)] text-[var(--color-text)]">{r.record_type}</Badge>
                  </td>
                  <td className="px-6 py-4 font-bold text-[var(--color-accent)]">{r.name}</td>
                  <td className="px-6 py-4 text-[var(--color-text)] font-mono break-all text-xs">
                    {r.content}
                  </td>
                  <td className="px-6 py-4 text-[var(--color-text-secondary)] font-mono text-xs">{r.ttl}</td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button variant="ghost" size="icon" onClick={() => setEditing(r)} disabled={busy} className="h-8 w-8 hover:bg-[var(--color-text)] hover:text-white" aria-label="编辑">
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => setConfirming(r)} disabled={busy} className="h-8 w-8 hover:bg-red-600 hover:text-white text-red-600" aria-label="删除">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}

              {rows.length === 0 && !busy && (
                <tr>
                  <td colSpan={5} className="px-6 py-16 text-center text-[var(--color-text-secondary)]">
                    <div className="flex flex-col items-center gap-4">
                      <div className="w-12 h-12 bg-[var(--color-bg)] rounded-full flex items-center justify-center">
                        <AlertCircle className="w-6 h-6 opacity-50" />
                      </div>
                      <p className="font-medium uppercase tracking-wide text-xs">暂无解析记录</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {creating && (
        <RecordModal
          title="新增记录"
          initial={null}
          onClose={() => setCreating(false)}
          onSubmit={async (req) => {
            if (!masterPassword) return;
            setBusy(true);
            try {
              await createRecord(masterPassword, provider, domainId, domainName, req);
              notifySuccess("记录已创建");
              await refreshRecords();
            } catch (e) {
              notifyError(e);
            } finally {
              setBusy(false);
            }
          }}
        />
      )}

      {editing && (
        <RecordModal
          title="编辑记录"
          initial={editing}
          onClose={() => setEditing(null)}
          onSubmit={async (req) => {
            if (!masterPassword || !editing) return;
            setBusy(true);
            try {
              const update: RecordUpdateRequest = {
                id: editing.id,
                record_type: req.record_type,
                name: req.name,
                content: req.content,
                ttl: req.ttl,
                mx_priority: req.mx_priority ?? null,
                srv_priority: req.srv_priority ?? null,
                srv_weight: req.srv_weight ?? null,
                srv_port: req.srv_port ?? null,
                caa_flags: req.caa_flags ?? null,
                caa_tag: req.caa_tag ?? null,
              };
              await updateRecord(masterPassword, provider, domainId, domainName, update);
              notifySuccess("记录已更新");
              await refreshRecords();
            } catch (e) {
              notifyError(e);
            } finally {
              setBusy(false);
            }
          }}
        />
      )}

      {confirming && (
        <Modal title="删除记录" onClose={() => setConfirming(null)}>
          <div className="space-y-6">
            <div className="bg-red-50 p-6 border border-red-100 text-red-600 flex items-start gap-4">
              <AlertCircle className="w-6 h-6 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold uppercase tracking-wide">您确定吗？</p>
                <p className="text-sm mt-2 font-mono bg-white/50 p-2 border border-red-200 inline-block">
                  {confirming.record_type} {confirming.name}
                </p>
                <p className="text-xs mt-2 opacity-80">此操作无法撤销。</p>
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="secondary" onClick={() => setConfirming(null)} disabled={busy} className="text-xs uppercase tracking-wide">
                取消
              </Button>
              <Button variant="destructive" onClick={() => void onDelete(confirming)} disabled={busy} className="text-xs uppercase tracking-wide">
                确认删除
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

export function RecordModal({
  title,
  initial,
  onClose,
  onSubmit,
}: {
  title: string;
  initial: DnsRecord | null;
  onClose: () => void;
  onSubmit: (req: RecordCreateRequest) => Promise<void>;
}) {
  const [recordType, setRecordType] = useState(initial?.record_type ?? "A");
  const [name, setName] = useState(initial?.name ?? "@");
  const [content, setContent] = useState(initial?.content ?? "");
  const [ttl, setTtl] = useState<number>(initial?.ttl ?? 600);

  const [mxPriority, setMxPriority] = useState<number>(initial?.mx_priority ?? 10);
  const [srvPriority, setSrvPriority] = useState<number>(initial?.srv_priority ?? 0);
  const [srvWeight, setSrvWeight] = useState<number>(initial?.srv_weight ?? 0);
  const [srvPort, setSrvPort] = useState<number>(initial?.srv_port ?? 0);
  const [caaFlags, setCaaFlags] = useState<number>(initial?.caa_flags ?? 0);
  const [caaTag, setCaaTag] = useState<string>(initial?.caa_tag ?? "issue");

  const [conflictStrategy, setConflictStrategy] = useState<ConflictStrategy>("do_not_create");
  const [error, setError] = useState<string | null>(null);
  
  const recordTypeOptions = useMemo<DropdownOption<string>[]>(
    () => RECORD_TYPES.map((t) => ({ value: t, label: t })),
    [],
  );

  const validate = () => {
    const trimmedContent = content.trim();
    if (!trimmedContent) return "记录值不能为空";
    
    // Add more validation if needed, similar to SmartResolvePage
    if (ttl < 60 || ttl > 86400) return "TTL 必须在 60-86400 秒之间";
    
    if (recordType === "A") {
      const ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
      if (!ipv4Regex.test(trimmedContent)) return "A 记录必须是有效的 IPv4 地址";
    }
    
    if (recordType === "AAAA") {
      const ipv6Regex = /^[0-9a-fA-F:]+$/;
      if (!ipv6Regex.test(trimmedContent) || !trimmedContent.includes(":")) return "AAAA 记录必须是有效的 IPv6 地址";
    }

    if (recordType === "CNAME" || recordType === "NS" || recordType === "MX" || recordType === "SRV") {
       if (!trimmedContent.includes(".")) return "记录值必须是有效域名";
    }
    
    return null;
  };

  const handleSubmit = () => {
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    onClose();
    void onSubmit({
      record_type: recordType,
      name,
      content,
      ttl,
      mx_priority: mxPriority,
      srv_priority: srvPriority,
      srv_weight: srvWeight,
      srv_port: srvPort,
      caa_flags: caaFlags,
      caa_tag: caaTag,
      conflict_strategy: initial ? "do_not_create" : conflictStrategy,
    });
  };

  return (
    <Modal title={title} onClose={onClose}>
      <div className="space-y-6">
        {error && (
          <div className="bg-red-50 text-red-600 p-4 border border-red-200 text-sm font-medium flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            {error}
          </div>
        )}

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

        <Input
          label="主机记录 (@ 代表根域名)"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="@"
        />

        <div className="space-y-1.5">
           <label htmlFor="record-content" className="text-xs font-bold text-[var(--color-text-secondary)] uppercase tracking-wider">记录值</label>
           <textarea
             id="record-content"
             className="w-full h-24 p-4 rounded-none bg-[var(--color-surface)] border border-[var(--color-border)] focus:outline-none focus:border-[var(--color-primary)] text-sm resize-none font-mono"
             value={content}
             onChange={(e) => setContent(e.target.value)}
             placeholder="1.2.3.4"
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

        {!initial && (
           <div className="space-y-1.5">
            <label className="text-xs font-bold text-[var(--color-text-secondary)] uppercase tracking-wider">冲突策略</label>
            <Dropdown
              value={conflictStrategy}
              options={[
                { value: "do_not_create", label: "不创建 (失败)" },
                { value: "keep_existing", label: "保留现有 (忽略)" },
                { value: "replace_existing", label: "替换现有" },
              ]}
              onChange={(v) => setConflictStrategy(v as ConflictStrategy)}
              className="w-full"
            />
          </div>
        )}

        <div className="flex justify-end gap-3 pt-6 border-t border-[var(--color-border)]">
          <Button variant="secondary" onClick={onClose} className="text-xs uppercase tracking-wide">
            取消
          </Button>
          <Button onClick={() => void handleSubmit()} className="text-xs uppercase tracking-wide">
            保存记录
          </Button>
        </div>
      </div>
    </Modal>
  );
}
