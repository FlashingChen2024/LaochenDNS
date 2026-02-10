import { useEffect, useState } from "react";
import { ArrowLeft, CheckCircle2, AlertCircle, Trash2 } from "lucide-react";
import { useApp } from "../app/AppContext";
import { Button } from "../components/Button";
import { Input } from "../components/Input";
import { Card, CardHeader, CardTitle, CardContent } from "../components/Card";
import { Badge } from "../components/Badge";
import {
  clearCloudflare,
  clearDnspod,
  getIntegrations,
  listDomains,
  resolveErrorMessage,
  saveCloudflare,
  saveDnspod,
  testCloudflare,
  testDnspod,
  type DomainItem,
  type IntegrationsInfo,
  type IntegrationTestResult,
  type Provider,
} from "../lib/api";



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

export function IntegrationsPage() {
  const { masterPassword, notifyError, notifySuccess } = useApp();
  const [data, setData] = useState<IntegrationsInfo | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeProvider, setActiveProvider] = useState<Provider | null>(null);
  const [domains, setDomains] = useState<DomainItem[]>([]);
  const [domainsBusy, setDomainsBusy] = useState(false);
  const [domainsError, setDomainsError] = useState<string | null>(null);

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
      const message = resolveErrorMessage(e);
      setError(message);
    }
  };

  useEffect(() => {
    void load();
  }, [masterPassword]);

  const loadProviderDomains = async (provider: Provider) => {
    if (!masterPassword) return;
    setDomainsBusy(true);
    setDomainsError(null);
    try {
      const list = await listDomains(masterPassword, provider, "");
      setDomains(list.filter((d) => d.provider_id));
    } catch (e) {
      const message = resolveErrorMessage(e);
      setDomainsError(message);
      notifyError(message);
    } finally {
      setDomainsBusy(false);
    }
  };

  const openProvider = (provider: Provider) => {
    setActiveProvider(provider);
    setDomains([]);
    setDomainsError(null);
    setCfTest(null);
    setDpTest(null);
    if (data && (provider === "cloudflare" ? data.cloudflare.configured : data.dnspod.configured)) {
      void loadProviderDomains(provider);
    }
  };

  const closeDetail = () => {
    setActiveProvider(null);
    setDomains([]);
    setDomainsError(null);
  };

  const onCfTest = async () => {
    setCfTest(null);
    try {
      const r = await testCloudflare(cfEmail, cfApiKey);
      setCfTest(r);
      if (r.ok && masterPassword) {
        await saveCloudflare(masterPassword, cfEmail, cfApiKey);
        setCfApiKey("");
        await load();
        void loadProviderDomains("cloudflare");
      }
    } catch (e) {
      setCfTest({ ok: false, message: resolveErrorMessage(e) });
    }
  };

  const onDpTest = async () => {
    setDpTest(null);
    try {
      const r = await testDnspod(dpTokenId, dpToken);
      setDpTest(r);
      if (r.ok && masterPassword) {
        await saveDnspod(masterPassword, dpTokenId, dpToken);
        setDpToken("");
        await load();
        void loadProviderDomains("dnspod");
      }
    } catch (e) {
      setDpTest({ ok: false, message: resolveErrorMessage(e) });
    }
  };

  const onCfClear = async () => {
    if (!masterPassword) return;
    setBusy(true);
    setError(null);
    try {
      await clearCloudflare(masterPassword);
      notifySuccess("Cloudflare 凭据已清除");
      await load();
      closeDetail();
    } catch (e) {
      const message = resolveErrorMessage(e);
      setError(message);
      notifyError(message);
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
      notifySuccess("DNSPod 凭据已清除");
      await load();
      closeDetail();
    } catch (e) {
      const message = resolveErrorMessage(e);
      setError(message);
      notifyError(message);
    } finally {
      setBusy(false);
    }
  };

  if (activeProvider) {
    const isCf = activeProvider === "cloudflare";
    const isConfigured = data ? (isCf ? data.cloudflare.configured : data.dnspod.configured) : false;

    return (
      <div className="space-y-8 animate-in slide-in-from-right-8 duration-500">
        <div className="flex items-center gap-4 border-b border-[var(--color-border)] pb-6">
          <Button variant="ghost" size="icon" onClick={closeDetail} className="rounded-full w-10 h-10 hover:bg-[var(--color-text)] hover:text-white transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight uppercase text-[var(--color-accent)] leading-none">
              配置 {isCf ? "Cloudflare" : "DNSPod"}
            </h1>
            <p className="text-sm font-medium text-[var(--color-text-secondary)] mt-1 tracking-wide uppercase">
              {isCf ? "Global API Key & Email" : "Token ID & Token Secret"}
            </p>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 p-4 border border-red-200 text-sm font-medium flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Config Card */}
          <Card className="h-full">
            <CardHeader className="border-b border-[var(--color-border)] p-6">
              <CardTitle>API 凭据</CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              {isConfigured ? (
                <div className="bg-green-50 text-green-700 p-4 border border-green-200 flex items-center justify-between">
                  <div className="flex items-center gap-2 font-bold uppercase tracking-wide text-xs">
                    <CheckCircle2 className="w-5 h-5" />
                    <span>已连接</span>
                  </div>
                  <Button variant="destructive" size="sm" onClick={isCf ? onCfClear : onDpClear} loading={busy} className="h-8 text-xs">
                    <Trash2 className="w-3 h-3 mr-2" />
                    移除
                  </Button>
                </div>
              ) : (
                <div className="bg-orange-50 text-orange-700 p-4 border border-orange-200 flex items-center gap-2 font-bold uppercase tracking-wide text-xs">
                   <AlertCircle className="w-5 h-5" />
                   <span>未配置</span>
                </div>
              )}

              {isCf ? (
                <div className="space-y-4">
                  <Input
                    label="Email"
                    value={cfEmail}
                    onChange={(e) => setCfEmail(e.target.value)}
                    placeholder="example@gmail.com"
                  />
                  <Input
                    label="Global API Key"
                    type="password"
                    value={cfApiKey}
                    onChange={(e) => setCfApiKey(e.target.value)}
                    placeholder="Global API Key"
                  />
                  <Button onClick={onCfTest} className="w-full mt-4">
                    验证并保存
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <Input
                    label="ID"
                    value={dpTokenId}
                    onChange={(e) => setDpTokenId(e.target.value)}
                    placeholder="Token ID"
                  />
                  <Input
                    label="Token"
                    type="password"
                    value={dpToken}
                    onChange={(e) => setDpToken(e.target.value)}
                    placeholder="Token Secret"
                  />
                  <Button onClick={onDpTest} className="w-full mt-4">
                    验证并保存
                  </Button>
                </div>
              )}

              {/* Test Result */}
              {(isCf ? cfTest : dpTest) && (
                <div className={`p-4 border text-sm font-medium ${(isCf ? cfTest : dpTest)?.ok ? "bg-green-50 text-green-700 border-green-200" : "bg-red-50 text-red-700 border-red-200"}`}>
                  {(isCf ? cfTest : dpTest)?.ok ? (
                    <div className="flex items-center gap-2 uppercase tracking-wide text-xs">
                      <CheckCircle2 className="w-4 h-4" />
                      验证成功
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <AlertCircle className="w-4 h-4" />
                      {(isCf ? cfTest : dpTest)?.message}
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Domains Preview */}
          <Card className="h-full flex flex-col">
            <CardHeader className="border-b border-[var(--color-border)] p-6">
              <CardTitle>域名列表预览</CardTitle>
            </CardHeader>
            <CardContent className="flex-1 overflow-auto p-0">
              {domainsBusy ? (
                <div className="flex justify-center p-12">
                  <div className="animate-spin h-8 w-8 border-2 border-[var(--color-primary)] border-t-transparent rounded-full"></div>
                </div>
              ) : domainsError ? (
                <div className="text-red-500 text-sm p-6 font-medium border-b border-red-100 bg-red-50">{domainsError}</div>
              ) : domains.length > 0 ? (
                <div className="divide-y divide-[var(--color-border)]">
                  {domains.map((d) => (
                    <div key={d.provider_id} className="flex items-center justify-between p-4 hover:bg-[var(--color-bg)] transition-colors">
                      <span className="font-bold text-[var(--color-text)]">{d.name}</span>
                      <StatusBadge status={d.status} />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center text-[var(--color-text-secondary)] py-12 px-6">
                  <p className="text-sm font-medium uppercase tracking-wide">暂无域名</p>
                  <p className="text-xs mt-1 opacity-70">请配置凭据以获取域名列表</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col gap-2 border-b border-[var(--color-border)] pb-6">
        <h1 className="text-4xl font-bold tracking-tight uppercase text-[var(--color-accent)] leading-none">服务接入</h1>
        <p className="text-sm font-medium text-[var(--color-text-secondary)] tracking-wide uppercase">
          配置 DNS 服务商凭据
        </p>
      </div>
      
      {error && (
        <div className="bg-red-50 text-red-600 p-4 border border-red-200 text-sm font-medium flex items-center gap-2">
          <AlertCircle className="w-4 h-4" />
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Cloudflare Card */}
        <Card 
          className="group cursor-pointer hover:border-[var(--color-primary)] transition-all duration-300 relative overflow-hidden"
          onClick={() => openProvider("cloudflare")}
        >
          <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity">
            <ArrowLeft className="w-5 h-5 rotate-180 text-[var(--color-primary)]" />
          </div>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-[var(--color-accent)] uppercase tracking-tight">Cloudflare</h3>
              {data?.cloudflare.configured ? (
                <Badge variant="success" className="text-xs">已连接</Badge>
              ) : (
                <Badge variant="secondary" className="text-xs">未配置</Badge>
              )}
            </div>
            <p className="text-sm text-[var(--color-text-secondary)] font-medium leading-relaxed">
              全球领先的 CDN 与安全服务提供商
            </p>
          </CardContent>
        </Card>

        {/* DNSPod Card */}
        <Card 
          className="group cursor-pointer hover:border-[var(--color-primary)] transition-all duration-300 relative overflow-hidden"
          onClick={() => openProvider("dnspod")}
        >
          <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity">
            <ArrowLeft className="w-5 h-5 rotate-180 text-[var(--color-primary)]" />
          </div>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-[var(--color-accent)] uppercase tracking-tight">DNSPod</h3>
              {data?.dnspod.configured ? (
                <Badge variant="success" className="text-xs">已连接</Badge>
              ) : (
                <Badge variant="secondary" className="text-xs">未配置</Badge>
              )}
            </div>
            <p className="text-sm text-[var(--color-text-secondary)] font-medium leading-relaxed">
              腾讯云旗下专业域名解析服务商
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
