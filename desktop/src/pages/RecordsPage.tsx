import { useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { Modal } from "../components/Modal";
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

function providerLabel(p: Provider) {
  return p === "cloudflare" ? "Cloudflare" : "DNSPod";
}

export function RecordsPage() {
  const { masterPassword, notifyError, notifySuccess } = useApp();
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

  const load = async () => {
    if (!masterPassword) return;
    setBusy(true);
    setError(null);
    try {
      const data = await listRecords(masterPassword, provider, domainId, domainName);
      setRows(data);
    } catch (e) {
      setError(resolveErrorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    void load();
  }, [masterPassword, provider, domainId, domainName]);

  const title = useMemo(() => {
    if (!domainName) return "解析记录";
    return `${domainName} / ${providerLabel(provider)}`;
  }, [domainName, provider]);

  const onDelete = async (r: DnsRecord) => {
    if (!masterPassword) return;
    setBusy(true);
    setError(null);
    try {
      await deleteRecord(masterPassword, provider, domainId, r.id);
      notifySuccess("记录删除成功");
      await load();
      setConfirming(null);
    } catch (e) {
      const message = resolveErrorMessage(e);
      setError(message);
      notifyError(message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">{title}</div>
          <div className="muted">单条记录新增 / 编辑 / 删除，新增支持冲突策略</div>
        </div>
        <div className="row">
          <button className="btn btn-secondary" onClick={() => void load()} disabled={busy}>
            刷新
          </button>
          <button className="btn btn-primary" onClick={() => setCreating(true)} disabled={busy}>
            新增记录
          </button>
        </div>
      </div>

      {error ? <div className="error">{error}</div> : null}

      <table className="table" style={{ marginTop: 12 }}>
        <thead>
          <tr>
            <th style={{ width: "10%" }}>类型</th>
            <th style={{ width: "18%" }}>主机记录</th>
            <th style={{ width: "44%" }}>记录值</th>
            <th style={{ width: "10%" }}>TTL</th>
            <th style={{ width: "18%" }}>操作</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id}>
              <td>{r.record_type}</td>
              <td>{r.name}</td>
              <td style={{ wordBreak: "break-all" }}>{r.content}</td>
              <td>{r.ttl}</td>
              <td>
                <div className="row">
                  <button className="btn btn-secondary" onClick={() => setEditing(r)} disabled={busy}>
                    编辑
                  </button>
                  <button className="btn btn-danger" onClick={() => setConfirming(r)} disabled={busy}>
                    删除
                  </button>
                </div>
              </td>
            </tr>
          ))}

          {rows.length === 0 ? (
            <tr>
              <td colSpan={5} className="muted">
                暂无记录
              </td>
            </tr>
          ) : null}
        </tbody>
      </table>

      {creating ? (
        <RecordModal
          title="新增记录"
          initial={null}
          onClose={() => setCreating(false)}
          onSubmit={async (req) => {
            if (!masterPassword) return;
            setBusy(true);
            try {
              await createRecord(masterPassword, provider, domainId, domainName, req);
              notifySuccess("记录新增成功");
              await load();
            } catch (e) {
              notifyError(e);
              throw e;
            } finally {
              setBusy(false);
            }
          }}
        />
      ) : null}

      {editing ? (
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
              notifySuccess("记录更新成功");
              await load();
            } catch (e) {
              notifyError(e);
              throw e;
            } finally {
              setBusy(false);
            }
          }}
        />
      ) : null}
      {confirming ? (
        <Modal title="确认删除" onClose={() => setConfirming(null)}>
          <div className="muted">确认删除 {confirming.record_type} {confirming.name} ?</div>
          <div className="row" style={{ justifyContent: "flex-end", marginTop: 12 }}>
            <button className="btn btn-secondary" onClick={() => setConfirming(null)} disabled={busy}>
              取消
            </button>
            <button className="btn btn-danger" onClick={() => void onDelete(confirming)} disabled={busy}>
              删除
            </button>
          </div>
        </Modal>
      ) : null}
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
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isCreate = !initial;

  const validate = () => {
    const trimmedName = name.trim();
    const trimmedContent = content.trim();
    if (!trimmedName) return "主机记录不能为空";
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

  const submit = async () => {
    setError(null);
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }
    setBusy(true);
    try {
      const req: RecordCreateRequest = {
        record_type: recordType,
        name,
        content,
        ttl,
        conflict_strategy: conflictStrategy,
      };
      if (recordType === "MX") req.mx_priority = mxPriority;
      if (recordType === "SRV") {
        req.srv_priority = srvPriority;
        req.srv_weight = srvWeight;
        req.srv_port = srvPort;
      }
      if (recordType === "CAA") {
        req.caa_flags = caaFlags;
        req.caa_tag = caaTag;
      }
      await onSubmit(req);
      onClose();
    } catch (e) {
      setError(resolveErrorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal title={title} onClose={onClose}>
      <div className="form">
        <div className="grid-2">
          <label className="label">
            类型
            <select className="select" value={recordType} onChange={(e) => setRecordType(e.target.value)}>
              {RECORD_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </label>
          <label className="label">
            TTL（秒）
            <input className="input" value={ttl} onChange={(e) => setTtl(Number(e.target.value || 0))} />
          </label>
        </div>

        <label className="label">
          主机记录（Name）
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="例如 @ 或 www 或 _acme-challenge" />
        </label>

        <label className="label">
          记录值（Content）
          <input className="input" value={content} onChange={(e) => setContent(e.target.value)} />
        </label>

        {recordType === "MX" ? (
          <label className="label">
            MX 优先级
            <input className="input" value={mxPriority} onChange={(e) => setMxPriority(Number(e.target.value || 0))} />
          </label>
        ) : null}

        {recordType === "SRV" ? (
          <div className="grid-3">
            <label className="label">
              SRV 优先级
              <input className="input" value={srvPriority} onChange={(e) => setSrvPriority(Number(e.target.value || 0))} />
            </label>
            <label className="label">
              SRV 权重
              <input className="input" value={srvWeight} onChange={(e) => setSrvWeight(Number(e.target.value || 0))} />
            </label>
            <label className="label">
              SRV 端口
              <input className="input" value={srvPort} onChange={(e) => setSrvPort(Number(e.target.value || 0))} />
            </label>
          </div>
        ) : null}

        {recordType === "CAA" ? (
          <div className="grid-2">
            <label className="label">
              CAA Flags
              <input className="input" value={caaFlags} onChange={(e) => setCaaFlags(Number(e.target.value || 0))} />
            </label>
            <label className="label">
              CAA Tag
              <select className="select" value={caaTag} onChange={(e) => setCaaTag(e.target.value)}>
                <option value="issue">issue</option>
                <option value="issuewild">issuewild</option>
                <option value="iodef">iodef</option>
              </select>
            </label>
          </div>
        ) : null}

        {isCreate ? (
          <label className="label">
            冲突策略（同名 + 同类型）
            <select className="select" value={conflictStrategy} onChange={(e) => setConflictStrategy(e.target.value as ConflictStrategy)}>
              <option value="do_not_create">不创建</option>
              <option value="overwrite">强制覆盖</option>
            </select>
          </label>
        ) : null}

        {error ? <div className="error">{error}</div> : null}

        <div className="row" style={{ justifyContent: "flex-end" }}>
          <button className="btn btn-secondary" onClick={onClose} disabled={busy}>
            取消
          </button>
          <button className="btn btn-primary" onClick={() => void submit()} disabled={busy}>
            保存
          </button>
        </div>
      </div>
    </Modal>
  );
}
