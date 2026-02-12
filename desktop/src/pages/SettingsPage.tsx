import { Shield, Info, HardDrive } from "lucide-react";
import { useApp } from "../app/AppContext";
import { Card, CardHeader, CardTitle, CardContent } from "../components/Card";
import { Badge } from "../components/Badge";
import Logo from "../assets/logo.png";

export function SettingsPage() {
  const { vaultStatus } = useApp();

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col gap-2 border-b border-[var(--color-border)] pb-6">
        <h1 className="text-4xl font-bold tracking-tight uppercase text-[var(--color-accent)] leading-none">系统设置</h1>
        <p className="text-sm font-medium text-[var(--color-text-secondary)] tracking-wide uppercase">
          应用状态与存储信息
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <Card className="h-full">
          <CardHeader className="border-b border-[var(--color-border)] p-6">
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-[var(--color-primary)]" />
              <CardTitle>安全保险箱</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            <div className="flex items-center justify-between p-4 bg-[var(--color-bg)] border border-[var(--color-border)]">
              <span className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-secondary)]">初始化状态</span>
              <Badge variant={vaultStatus?.initialized ? "success" : "warning"} className="uppercase">
                {vaultStatus?.initialized ? "已初始化" : "未初始化"}
              </Badge>
            </div>
            <div className="flex items-center justify-between p-4 bg-[var(--color-bg)] border border-[var(--color-border)]">
               <span className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-secondary)]">加密方式</span>
               <span className="text-xs font-mono text-[var(--color-text)]">AES-256-GCM</span>
            </div>
          </CardContent>
        </Card>

        <Card className="h-full">
          <CardHeader className="border-b border-[var(--color-border)] p-6">
             <div className="flex items-center gap-2">
              <HardDrive className="w-5 h-5 text-[var(--color-primary)]" />
              <CardTitle>数据状态</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            <div className="flex items-center justify-between p-4 bg-[var(--color-bg)] border border-[var(--color-border)]">
              <span className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-secondary)]">Cloudflare</span>
              <Badge variant={vaultStatus?.cloudflare_configured ? "success" : "secondary"} className="uppercase">
                {vaultStatus?.cloudflare_configured ? "已存储" : "未存储"}
              </Badge>
            </div>
            <div className="flex items-center justify-between p-4 bg-[var(--color-bg)] border border-[var(--color-border)]">
              <span className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-secondary)]">DNSPod</span>
              <Badge variant={vaultStatus?.dnspod_configured ? "success" : "secondary"} className="uppercase">
                {vaultStatus?.dnspod_configured ? "已存储" : "未存储"}
              </Badge>
            </div>
          </CardContent>

            <div className="flex items-center justify-between p-4 bg-[var(--color-bg)] border border-[var(--color-border)]">
              <span className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-secondary)]">阿里云DNS</span>
              <Badge variant={vaultStatus?.aliyun_configured ? "success" : "secondary"} className="uppercase">
                {vaultStatus?.aliyun_configured ? "已存储" : "未存储"}
              </Badge>
            </div>

            <div className="flex items-center justify-between p-4 bg-[var(--color-bg)] border border-[var(--color-border)]">
              <span className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-secondary)]">华为云DNS</span>
              <Badge variant={vaultStatus?.huawei_configured ? "success" : "secondary"} className="uppercase">
                {vaultStatus?.huawei_configured ? "已存储" : "未存储"}
              </Badge>
            </div>

            <div className="flex items-center justify-between p-4 bg-[var(--color-bg)] border border-[var(--color-border)]">
              <span className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-secondary)]">百度智能云DNS</span>
              <Badge variant={vaultStatus?.baidu_configured ? "success" : "secondary"} className="uppercase">
                {vaultStatus?.baidu_configured ? "已存储" : "未存储"}
              </Badge>
            </div>

            <div className="flex items-center justify-between p-4 bg-[var(--color-bg)] border border-[var(--color-border)]">
              <span className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-secondary)]">DNS.COM</span>
              <Badge variant={vaultStatus?.dnscom_configured ? "success" : "secondary"} className="uppercase">
                {vaultStatus?.dnscom_configured ? "已存储" : "未存储"}
              </Badge>
            </div>
            <div className="flex items-center justify-between p-4 bg-[var(--color-bg)] border border-[var(--color-border)]">
              <span className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-secondary)]">雨云DNS</span>
              <Badge variant={vaultStatus?.rainyun_configured ? "success" : "secondary"} className="uppercase">
                {vaultStatus?.rainyun_configured ? "已存储" : "未存储"}
              </Badge>
            </div>
            <div className="flex items-center justify-between p-4 bg-[var(--color-bg)] border border-[var(--color-border)]">
              <span className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-secondary)]">腾讯云DNS</span>
              <Badge variant={vaultStatus?.tencentcloud_configured ? "success" : "secondary"} className="uppercase">
                {vaultStatus?.tencentcloud_configured ? "已存储" : "未存储"}
              </Badge>
            </div>
        </Card>


        <Card className="md:col-span-2">
          <CardHeader className="border-b border-[var(--color-border)] p-6">
             <div className="flex items-center gap-2">
              <Info className="w-5 h-5 text-[var(--color-primary)]" />
              <CardTitle>关于</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            <div className="flex items-center gap-6">
              <div className="w-20 h-20 bg-white border border-[var(--color-border)] flex items-center justify-center shadow-sm p-4">
                <img src={Logo} alt="LaoChenDNS" className="w-full h-full object-contain" />
              </div>
              <div className="space-y-1">
                <h3 className="text-2xl font-bold text-[var(--color-accent)] uppercase tracking-tight">LaoChenDNS Desktop</h3>
                <p className="text-xs font-medium text-[var(--color-text-secondary)] uppercase tracking-widest">v2.1.0</p>
                <p className="text-sm text-[var(--color-text)] mt-2 leading-relaxed max-w-lg">
                  专为简约高效而设计的安全域名管理工具。采用瑞士国际主义设计风格，回归功能本质。
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
