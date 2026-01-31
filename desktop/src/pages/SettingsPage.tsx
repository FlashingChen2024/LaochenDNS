import { useApp } from "../app/AppContext";

export function SettingsPage() {
  const { vaultStatus } = useApp();

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">设置</div>
          <div className="muted">本地加密存储与应用状态</div>
        </div>
      </div>

      <div className="card">
        <div className="h1">状态</div>
        <div style={{ marginTop: 10 }} className="muted">
          Vault 初始化：{vaultStatus?.initialized ? "是" : "否"}
        </div>
        <div className="muted">Cloudflare 已配置：{vaultStatus?.cloudflare_configured ? "是" : "否"}</div>
        <div className="muted">DNSPod 已配置：{vaultStatus?.dnspod_configured ? "是" : "否"}</div>
      </div>
    </div>
  );
}
