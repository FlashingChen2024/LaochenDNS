import { invoke } from "@tauri-apps/api/core";

export type Provider =
  | "cloudflare"
  | "dnspod"
  | "aliyun"
  | "huawei"
  | "baidu"
  | "dnscom"
  | "rainyun"
  | "tencentcloud";

export type VaultStatus = {
  initialized: boolean;
  cloudflare_configured: boolean;
  dnspod_configured: boolean;
  aliyun_configured: boolean;
  huawei_configured: boolean;
  baidu_configured: boolean;
  dnscom_configured: boolean;
  rainyun_configured: boolean;
  tencentcloud_configured: boolean;
};

export type IntegrationInfoItem = {
  configured: boolean;
  last_verified_at: string | null;
};

export type IntegrationsInfo = {
  cloudflare: IntegrationInfoItem;
  dnspod: IntegrationInfoItem;
  aliyun: IntegrationInfoItem;
  huawei: IntegrationInfoItem;
  baidu: IntegrationInfoItem;
  dnscom: IntegrationInfoItem;
  rainyun: IntegrationInfoItem;
  tencentcloud: IntegrationInfoItem;
};

export type IntegrationTestResult = {
  ok: boolean;
  message: string;
};

export type DomainStatus =
  | "ok"
  | "auth_failed"
  | "unreachable"
  | "fetch_failed"
  | "not_configured";

export type DomainItem = {
  provider: Provider;
  name: string;
  provider_id: string;
  status: DomainStatus;
  records_count: number | null;
  last_changed_at: string | null;
};

export type DnsRecord = {
  id: string;
  provider: Provider;
  domain: string;
  record_type: string;
  name: string;
  content: string;
  ttl: number;
  mx_priority: number | null;
  srv_priority: number | null;
  srv_weight: number | null;
  srv_port: number | null;
  caa_flags: number | null;
  caa_tag: string | null;
};

export type ConflictStrategy = "do_not_create" | "overwrite";

export type RecordCreateRequest = {
  record_type: string;
  name: string;
  content: string;
  ttl: number;
  conflict_strategy: ConflictStrategy;
  mx_priority?: number | null;
  srv_priority?: number | null;
  srv_weight?: number | null;
  srv_port?: number | null;
  caa_flags?: number | null;
  caa_tag?: string | null;
};

export type RecordUpdateRequest = {
  id: string;
  record_type: string;
  name: string;
  content: string;
  ttl: number;
  mx_priority?: number | null;
  srv_priority?: number | null;
  srv_weight?: number | null;
  srv_port?: number | null;
  caa_flags?: number | null;
  caa_tag?: string | null;
};

export type AppError = {
  code: string;
  message: string;
};


export function resolveErrorMessage(error: unknown): string {
  if (typeof error === "string") return error;
  if (error instanceof Error) return error.message;
  if (error && typeof error === "object") {
    const maybeMessage = (error as { message?: unknown }).message;
    if (typeof maybeMessage === "string") return maybeMessage;
    try {
      return JSON.stringify(error);
    } catch {
      return String(error);
    }
  }
  return String(error);
}

export async function getVaultStatus(): Promise<VaultStatus> {
  return invoke("vault_status");
}

export async function initializeVault(masterPassword: string): Promise<void> {
  return invoke("vault_initialize", { masterPassword });
}

export async function unlockVault(masterPassword: string): Promise<void> {
  return invoke("vault_unlock", { masterPassword });
}

export async function getIntegrations(masterPassword: string): Promise<IntegrationsInfo> {
  return invoke("integrations_get", { masterPassword });
}

export async function testCloudflare(email: string, apiKey: string): Promise<IntegrationTestResult> {
  return invoke("cloudflare_test", { email, apiKey });
}

export async function saveCloudflare(
  masterPassword: string,
  email: string,
  apiKey: string,
): Promise<void> {
  return invoke("cloudflare_save", { masterPassword, email, apiKey });
}

export async function clearCloudflare(masterPassword: string): Promise<void> {
  return invoke("cloudflare_clear", { masterPassword });
}

export async function testDnspod(tokenId: string, token: string): Promise<IntegrationTestResult> {
  return invoke("dnspod_test", { tokenId, token });
}

export async function saveDnspod(
  masterPassword: string,
  tokenId: string,
  token: string,
): Promise<void> {
  return invoke("dnspod_save", { masterPassword, tokenId, token });
}

export async function clearDnspod(masterPassword: string): Promise<void> {
  return invoke("dnspod_clear", { masterPassword });
}

export async function testAliyun(
  accessKeyId: string,
  accessKeySecret: string,
): Promise<IntegrationTestResult> {
  return invoke("aliyun_test", { accessKeyId, accessKeySecret });
}

export async function saveAliyun(
  masterPassword: string,
  accessKeyId: string,
  accessKeySecret: string,
): Promise<void> {
  return invoke("aliyun_save", { masterPassword, accessKeyId, accessKeySecret });
}

export async function clearAliyun(masterPassword: string): Promise<void> {
  return invoke("aliyun_clear", { masterPassword });
}

export async function testHuawei(token: string): Promise<IntegrationTestResult> {
  return invoke("huawei_test", { token });
}

export async function saveHuawei(masterPassword: string, token: string): Promise<void> {
  return invoke("huawei_save", { masterPassword, token });
}

export async function clearHuawei(masterPassword: string): Promise<void> {
  return invoke("huawei_clear", { masterPassword });
}

export async function testBaidu(
  accessKeyId: string,
  secretAccessKey: string,
): Promise<IntegrationTestResult> {
  return invoke("baidu_test", { accessKeyId, secretAccessKey });
}

export async function saveBaidu(
  masterPassword: string,
  accessKeyId: string,
  secretAccessKey: string,
): Promise<void> {
  return invoke("baidu_save", { masterPassword, accessKeyId, secretAccessKey });
}

export async function clearBaidu(masterPassword: string): Promise<void> {
  return invoke("baidu_clear", { masterPassword });
}

export async function testDnscom(apiKey: string, apiSecret: string): Promise<IntegrationTestResult> {
  return invoke("dnscom_test", { apiKey, apiSecret });
}

export async function saveDnscom(
  masterPassword: string,
  apiKey: string,
  apiSecret: string,
): Promise<void> {
  return invoke("dnscom_save", { masterPassword, apiKey, apiSecret });
}

export async function clearDnscom(masterPassword: string): Promise<void> {
  return invoke("dnscom_clear", { masterPassword });
}

export async function testRainyun(apiKey: string): Promise<IntegrationTestResult> {
  return invoke("rainyun_test", { apiKey });
}

export async function saveRainyun(masterPassword: string, apiKey: string): Promise<void> {
  return invoke("rainyun_save", { masterPassword, apiKey });
}

export async function clearRainyun(masterPassword: string): Promise<void> {
  return invoke("rainyun_clear", { masterPassword });
}

export async function testTencentCloud(
  secretId: string,
  secretKey: string,
): Promise<IntegrationTestResult> {
  return invoke("tencentcloud_test", { secretId, secretKey });
}

export async function saveTencentCloud(
  masterPassword: string,
  secretId: string,
  secretKey: string,
): Promise<void> {
  return invoke("tencentcloud_save", { masterPassword, secretId, secretKey });
}

export async function clearTencentCloud(masterPassword: string): Promise<void> {
  return invoke("tencentcloud_clear", { masterPassword });
}

export async function listDomains(
  masterPassword: string,
  providerFilter: Provider | null,
  search: string,
): Promise<DomainItem[]> {
  return invoke("domains_list", {
    masterPassword,
    providerFilter: providerFilter ?? undefined,
    search: search || undefined,
  });
}

export async function listRecords(
  masterPassword: string,
  provider: Provider,
  domainId: string,
  domainName: string,
): Promise<DnsRecord[]> {
  return invoke("records_list", {
    masterPassword,
    provider,
    domainId,
    domainName,
  });
}

export async function createRecord(
  masterPassword: string,
  provider: Provider,
  domainId: string,
  domainName: string,
  req: RecordCreateRequest,
): Promise<DnsRecord> {
  return invoke("record_create", {
    masterPassword,
    provider,
    domainId,
    domainName,
    req,
  });
}

export async function updateRecord(
  masterPassword: string,
  provider: Provider,
  domainId: string,
  domainName: string,
  req: RecordUpdateRequest,
): Promise<DnsRecord> {
  return invoke("record_update", {
    masterPassword,
    provider,
    domainId,
    domainName,
    req,
  });
}

export async function deleteRecord(
  masterPassword: string,
  provider: Provider,
  domainId: string,
  domainName: string,
  recordId: string,
): Promise<void> {
  return invoke("record_delete", {
    masterPassword,
    provider,
    domainId,
    domainName,
    recordId,
  });
}
