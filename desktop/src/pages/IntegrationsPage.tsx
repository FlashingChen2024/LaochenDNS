import { useEffect, useState } from "react";
import { ArrowLeft, CheckCircle2, AlertCircle, Trash2 } from "lucide-react";
import { useApp } from "../app/AppContext";
import { Button } from "../components/Button";
import { Input } from "../components/Input";
import { Card, CardHeader, CardTitle, CardContent } from "../components/Card";
import { Badge } from "../components/Badge";
import {
  clearAliyun,
  clearBaidu,
  clearCloudflare,
  clearDnscom,
  clearDnspod,
  clearHuawei,
  clearRainyun,
  clearTencentCloud,
  getIntegrations,
  listDomains,
  resolveErrorMessage,
  saveAliyun,
  saveBaidu,
  saveCloudflare,
  saveDnscom,
  saveDnspod,
  saveHuawei,
  saveRainyun,
  saveTencentCloud,
  testAliyun,
  testBaidu,
  testCloudflare,
  testDnscom,
  testDnspod,
  testHuawei,
  testRainyun,
  testTencentCloud,
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

  const [aliyunAccessKeyId, setAliyunAccessKeyId] = useState("");
  const [aliyunAccessKeySecret, setAliyunAccessKeySecret] = useState("");
  const [aliyunTest, setAliyunTest] = useState<IntegrationTestResult | null>(null);

  const [huaweiToken, setHuaweiToken] = useState("");
  const [huaweiTest, setHuaweiTest] = useState<IntegrationTestResult | null>(null);

  const [baiduAccessKeyId, setBaiduAccessKeyId] = useState("");
  const [baiduSecretAccessKey, setBaiduSecretAccessKey] = useState("");
  const [baiduTest, setBaiduTest] = useState<IntegrationTestResult | null>(null);

  const [dnscomApiKey, setDnscomApiKey] = useState("");
  const [dnscomApiSecret, setDnscomApiSecret] = useState("");
  const [dnscomTest, setDnscomTest] = useState<IntegrationTestResult | null>(null);

  const [rainyunApiKey, setRainyunApiKey] = useState("");
  const [rainyunTest, setRainyunTest] = useState<IntegrationTestResult | null>(null);
  const [tencentSecretKey, setTencentSecretKey] = useState("");
  const [tencentSecretId, setTencentSecretId] = useState("");
  const [tencentTest, setTencentTest] = useState<IntegrationTestResult | null>(null);

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
    setAliyunTest(null);
    setHuaweiTest(null);
    setBaiduTest(null);
    setDnscomTest(null);
    setRainyunTest(null);
    setTencentTest(null);
    if (data && (data[provider as keyof IntegrationsInfo]?.configured ?? false)) {
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

  const onAliyunTest = async () => {
    setAliyunTest(null);
    try {
      const r = await testAliyun(aliyunAccessKeyId, aliyunAccessKeySecret);
      setAliyunTest(r);
      if (r.ok && masterPassword) {
        await saveAliyun(masterPassword, aliyunAccessKeyId, aliyunAccessKeySecret);
        setAliyunAccessKeySecret("");
        await load();
        void loadProviderDomains("aliyun");
      }
    } catch (e) {
      setAliyunTest({ ok: false, message: resolveErrorMessage(e) });
    }
  };

  const onHuaweiTest = async () => {
    setHuaweiTest(null);
    try {
      const r = await testHuawei(huaweiToken);
      setHuaweiTest(r);
      if (r.ok && masterPassword) {
        await saveHuawei(masterPassword, huaweiToken);
        setHuaweiToken("");
        await load();
        void loadProviderDomains("huawei");
      }
    } catch (e) {
      setHuaweiTest({ ok: false, message: resolveErrorMessage(e) });
    }
  };

  const onBaiduTest = async () => {
    setBaiduTest(null);
    try {
      const r = await testBaidu(baiduAccessKeyId, baiduSecretAccessKey);
      setBaiduTest(r);
      if (r.ok && masterPassword) {
        await saveBaidu(masterPassword, baiduAccessKeyId, baiduSecretAccessKey);
        setBaiduSecretAccessKey("");
        await load();
        void loadProviderDomains("baidu");
      }
    } catch (e) {
      setBaiduTest({ ok: false, message: resolveErrorMessage(e) });
    }
  };

  const onDnscomTest = async () => {
    setDnscomTest(null);
    try {
      const r = await testDnscom(dnscomApiKey, dnscomApiSecret);
      setDnscomTest(r);
      if (r.ok && masterPassword) {
        await saveDnscom(masterPassword, dnscomApiKey, dnscomApiSecret);
        setDnscomApiSecret("");
        await load();
        void loadProviderDomains("dnscom");
      }
    } catch (e) {
      setDnscomTest({ ok: false, message: resolveErrorMessage(e) });
    }
  };

  const onRainyunTest = async () => {
    setRainyunTest(null);
    try {
      const r = await testRainyun(rainyunApiKey);
      setRainyunTest(r);
      if (r.ok && masterPassword) {
        await saveRainyun(masterPassword, rainyunApiKey);
        setRainyunApiKey("");
        await load();
        void loadProviderDomains("rainyun");
      }
    } catch (e) {
      setRainyunTest({ ok: false, message: resolveErrorMessage(e) });
    }
  };

  const onTencentTest = async () => {
    setTencentTest(null);
    try {
      const r = await testTencentCloud(tencentSecretId, tencentSecretKey);
      setTencentTest(r);
      if (r.ok && masterPassword) {
        await saveTencentCloud(masterPassword, tencentSecretId, tencentSecretKey);
        setTencentSecretId("");
        setTencentSecretKey("");
        await load();
        void loadProviderDomains("tencentcloud");
      }
    } catch (e) {
      setTencentTest({ ok: false, message: resolveErrorMessage(e) });
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

  const onAliyunClear = async () => {
    if (!masterPassword) return;
    setBusy(true);
    setError(null);
    try {
      await clearAliyun(masterPassword);
      notifySuccess("阿里云DNS 凭据已清除");
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

  const onHuaweiClear = async () => {
    if (!masterPassword) return;
    setBusy(true);
    setError(null);
    try {
      await clearHuawei(masterPassword);
      notifySuccess("华为云DNS 凭据已清除");
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

  const onBaiduClear = async () => {
    if (!masterPassword) return;
    setBusy(true);
    setError(null);
    try {
      await clearBaidu(masterPassword);
      notifySuccess("百度智能云DNS 凭据已清除");
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

  const onDnscomClear = async () => {
    if (!masterPassword) return;
    setBusy(true);
    setError(null);
    try {
      await clearDnscom(masterPassword);
      notifySuccess("DNS.COM 凭据已清除");
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

  const onRainyunClear = async () => {
    if (!masterPassword) return;
    setBusy(true);
    setError(null);
    try {
      await clearRainyun(masterPassword);
      notifySuccess("雨云DNS 凭据已清除");
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

  const onTencentClear = async () => {
    if (!masterPassword) return;
    setBusy(true);
    setError(null);
    try {
      await clearTencentCloud(masterPassword);
      notifySuccess("腾讯云DNS 凭据已清除");
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

  const integrationByProvider = (provider: Provider) => {
    if (!data) return null;
    return data[provider as keyof IntegrationsInfo];
  };

  if (activeProvider) {
    const isConfigured = integrationByProvider(activeProvider)?.configured ?? false;
    const title = (() => {
      switch (activeProvider) {
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
          return "DNS 服务商";
      }
    })();
    const subtitle = (() => {
      switch (activeProvider) {
        case "cloudflare":
          return "Global API Key & Email";
        case "dnspod":
          return "Token ID & Token Secret";
        case "aliyun":
          return "AccessKeyId & AccessKeySecret";
        case "huawei":
          return "X-Auth-Token";
        case "baidu":
          return "AccessKeyId & SecretAccessKey";
        case "dnscom":
          return "ApiKey & ApiSecret";
        case "rainyun":
          return "ApiKey";
        case "tencentcloud":
          return "SecretId & SecretKey";
        default:
          return "";
      }
    })();
    const testResult = (() => {
      switch (activeProvider) {
        case "cloudflare":
          return cfTest;
        case "dnspod":
          return dpTest;
        case "aliyun":
          return aliyunTest;
        case "huawei":
          return huaweiTest;
        case "baidu":
          return baiduTest;
        case "dnscom":
          return dnscomTest;
        case "rainyun":
          return rainyunTest;
        case "tencentcloud":
          return tencentTest;
        default:
          return null;
      }
    })();
    const onClear = (() => {
      switch (activeProvider) {
        case "cloudflare":
          return onCfClear;
        case "dnspod":
          return onDpClear;
        case "aliyun":
          return onAliyunClear;
        case "huawei":
          return onHuaweiClear;
        case "baidu":
          return onBaiduClear;
        case "dnscom":
          return onDnscomClear;
        case "rainyun":
          return onRainyunClear;
        case "tencentcloud":
          return onTencentClear;
        default:
          return onCfClear;
      }
    })();

    return (
      <div className="space-y-8 animate-in slide-in-from-right-8 duration-500">
        <div className="flex items-center gap-4 border-b border-[var(--color-border)] pb-6">
          <Button variant="ghost" size="icon" onClick={closeDetail} className="rounded-full w-10 h-10 hover:bg-[var(--color-text)] hover:text-white transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight uppercase text-[var(--color-accent)] leading-none">
              配置 {title}
            </h1>
            <p className="text-sm font-medium text-[var(--color-text-secondary)] mt-1 tracking-wide uppercase">
              {subtitle}
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
                  <Button variant="destructive" size="sm" onClick={onClear} loading={busy} className="h-8 text-xs">
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

              {activeProvider === "cloudflare" ? (
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
              ) : activeProvider === "dnspod" ? (
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
              ) : activeProvider === "aliyun" ? (
                <div className="space-y-4">
                  <Input
                    label="AccessKeyId"
                    value={aliyunAccessKeyId}
                    onChange={(e) => setAliyunAccessKeyId(e.target.value)}
                    placeholder="AccessKeyId"
                  />
                  <Input
                    label="AccessKeySecret"
                    type="password"
                    value={aliyunAccessKeySecret}
                    onChange={(e) => setAliyunAccessKeySecret(e.target.value)}
                    placeholder="AccessKeySecret"
                  />
                  <Button onClick={onAliyunTest} className="w-full mt-4">
                    验证并保存
                  </Button>
                </div>
              ) : activeProvider === "huawei" ? (
                <div className="space-y-4">
                  <Input
                    label="X-Auth-Token"
                    type="password"
                    value={huaweiToken}
                    onChange={(e) => setHuaweiToken(e.target.value)}
                    placeholder="X-Auth-Token"
                  />
                  <Button onClick={onHuaweiTest} className="w-full mt-4">
                    验证并保存
                  </Button>
                </div>
              ) : activeProvider === "baidu" ? (
                <div className="space-y-4">
                  <Input
                    label="AccessKeyId"
                    value={baiduAccessKeyId}
                    onChange={(e) => setBaiduAccessKeyId(e.target.value)}
                    placeholder="AccessKeyId"
                  />
                  <Input
                    label="SecretAccessKey"
                    type="password"
                    value={baiduSecretAccessKey}
                    onChange={(e) => setBaiduSecretAccessKey(e.target.value)}
                    placeholder="SecretAccessKey"
                  />
                  <Button onClick={onBaiduTest} className="w-full mt-4">
                    验证并保存
                  </Button>
                </div>
              ) : activeProvider === "dnscom" ? (
                <div className="space-y-4">
                  <Input
                    label="ApiKey"
                    value={dnscomApiKey}
                    onChange={(e) => setDnscomApiKey(e.target.value)}
                    placeholder="ApiKey"
                  />
                  <Input
                    label="ApiSecret"
                    type="password"
                    value={dnscomApiSecret}
                    onChange={(e) => setDnscomApiSecret(e.target.value)}
                    placeholder="ApiSecret"
                  />
                  <Button onClick={onDnscomTest} className="w-full mt-4">
                    验证并保存
                  </Button>
                </div>
              ) : activeProvider === "tencentcloud" ? (
                <div className="space-y-4">
                  <Input
                    label="SecretId"
                    type="password"
                    value={tencentSecretId}
                    onChange={(e) => setTencentSecretId(e.target.value)}
                    placeholder="SecretId"
                  />
                  <Input
                    label="SecretKey"
                    type="password"
                    value={tencentSecretKey}
                    onChange={(e) => setTencentSecretKey(e.target.value)}
                    placeholder="SecretKey"
                  />
                  <Button onClick={onTencentTest} className="w-full mt-4">
                    验证并保存
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <Input
                    label="ApiKey"
                    type="password"
                    value={rainyunApiKey}
                    onChange={(e) => setRainyunApiKey(e.target.value)}
                    placeholder="ApiKey"
                  />
                  <Button onClick={onRainyunTest} className="w-full mt-4">
                    验证并保存
                  </Button>
                </div>
              )}

              {/* Test Result */}
              {testResult && (
                <div className={`p-4 border text-sm font-medium ${testResult.ok ? "bg-green-50 text-green-700 border-green-200" : "bg-red-50 text-red-700 border-red-200"}`}>
                  {testResult.ok ? (
                    <div className="flex items-center gap-2 uppercase tracking-wide text-xs">
                      <CheckCircle2 className="w-4 h-4" />
                      验证成功
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <AlertCircle className="w-4 h-4" />
                      {testResult.message}
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

        <Card 
          className="group cursor-pointer hover:border-[var(--color-primary)] transition-all duration-300 relative overflow-hidden"
          onClick={() => openProvider("aliyun")}
        >
          <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity">
            <ArrowLeft className="w-5 h-5 rotate-180 text-[var(--color-primary)]" />
          </div>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-[var(--color-accent)] uppercase tracking-tight">阿里云DNS</h3>
              {data?.aliyun.configured ? (
                <Badge variant="success" className="text-xs">已连接</Badge>
              ) : (
                <Badge variant="secondary" className="text-xs">未配置</Badge>
              )}
            </div>
            <p className="text-sm text-[var(--color-text-secondary)] font-medium leading-relaxed">
              阿里云公共 DNS 解析服务
            </p>
          </CardContent>
        </Card>

        <Card 
          className="group cursor-pointer hover:border-[var(--color-primary)] transition-all duration-300 relative overflow-hidden"
          onClick={() => openProvider("huawei")}
        >
          <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity">
            <ArrowLeft className="w-5 h-5 rotate-180 text-[var(--color-primary)]" />
          </div>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-[var(--color-accent)] uppercase tracking-tight">华为云DNS</h3>
              {data?.huawei.configured ? (
                <Badge variant="success" className="text-xs">已连接</Badge>
              ) : (
                <Badge variant="secondary" className="text-xs">未配置</Badge>
              )}
            </div>
            <p className="text-sm text-[var(--color-text-secondary)] font-medium leading-relaxed">
              华为云公共解析与域名管理
            </p>
          </CardContent>
        </Card>

        <Card 
          className="group cursor-pointer hover:border-[var(--color-primary)] transition-all duration-300 relative overflow-hidden"
          onClick={() => openProvider("baidu")}
        >
          <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity">
            <ArrowLeft className="w-5 h-5 rotate-180 text-[var(--color-primary)]" />
          </div>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-[var(--color-accent)] uppercase tracking-tight">百度智能云DNS</h3>
              {data?.baidu.configured ? (
                <Badge variant="success" className="text-xs">已连接</Badge>
              ) : (
                <Badge variant="secondary" className="text-xs">未配置</Badge>
              )}
            </div>
            <p className="text-sm text-[var(--color-text-secondary)] font-medium leading-relaxed">
              百度智能云解析服务
            </p>
          </CardContent>
        </Card>

        <Card 
          className="group cursor-pointer hover:border-[var(--color-primary)] transition-all duration-300 relative overflow-hidden"
          onClick={() => openProvider("dnscom")}
        >
          <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity">
            <ArrowLeft className="w-5 h-5 rotate-180 text-[var(--color-primary)]" />
          </div>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-[var(--color-accent)] uppercase tracking-tight">DNS.COM</h3>
              {data?.dnscom.configured ? (
                <Badge variant="success" className="text-xs">已连接</Badge>
              ) : (
                <Badge variant="secondary" className="text-xs">未配置</Badge>
              )}
            </div>
            <p className="text-sm text-[var(--color-text-secondary)] font-medium leading-relaxed">
              帝恩思开放 API 接入
            </p>
          </CardContent>
        </Card>

        <Card 
          className="group cursor-pointer hover:border-[var(--color-primary)] transition-all duration-300 relative overflow-hidden"
          onClick={() => openProvider("tencentcloud")}
        >
          <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity">
            <ArrowLeft className="w-5 h-5 rotate-180 text-[var(--color-primary)]" />
          </div>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-[var(--color-accent)] uppercase tracking-tight">腾讯云DNS</h3>
              {data?.tencentcloud.configured ? (
                <Badge variant="success" className="text-xs">已连接</Badge>
              ) : (
                <Badge variant="secondary" className="text-xs">未配置</Badge>
              )}
            </div>
            <p className="text-sm text-[var(--color-text-secondary)] font-medium leading-relaxed">
              腾讯云 DNS 解析服务
            </p>
          </CardContent>
        </Card>

        <Card 
          className="group cursor-pointer hover:border-[var(--color-primary)] transition-all duration-300 relative overflow-hidden"
          onClick={() => openProvider("rainyun")}
        >
          <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity">
            <ArrowLeft className="w-5 h-5 rotate-180 text-[var(--color-primary)]" />
          </div>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-[var(--color-accent)] uppercase tracking-tight">雨云DNS</h3>
              {data?.rainyun.configured ? (
                <Badge variant="success" className="text-xs">已连接</Badge>
              ) : (
                <Badge variant="secondary" className="text-xs">未配置</Badge>
              )}
            </div>
            <p className="text-sm text-[var(--color-text-secondary)] font-medium leading-relaxed">
              雨云域名解析服务
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
