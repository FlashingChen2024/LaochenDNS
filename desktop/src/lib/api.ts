import { invoke } from "@tauri-apps/api/core";

export type Provider = "cloudflare" | "dnspod";

export type VaultStatus = {
  initialized: boolean;
  cloudflare_configured: boolean;
  dnspod_configured: boolean;
};

export type IntegrationInfoItem = {
  configured: boolean;
  last_verified_at: string | null;
};

export type IntegrationsInfo = {
  cloudflare: IntegrationInfoItem;
  dnspod: IntegrationInfoItem;
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

export async function getVaultStatus(): Promise<VaultStatus> {
  return invoke("vault_status");
}

export async function initializeVault(masterPassword: string): Promise<void> {
  return invoke("vault_initialize", { master_password: masterPassword });
}

export async function unlockVault(masterPassword: string): Promise<void> {
  return invoke("vault_unlock", { master_password: masterPassword });
}

export async function getIntegrations(masterPassword: string): Promise<IntegrationsInfo> {
  return invoke("integrations_get", { master_password: masterPassword });
}

export async function testCloudflare(email: string, apiKey: string): Promise<IntegrationTestResult> {
  return invoke("cloudflare_test", { email, api_key: apiKey });
}

export async function saveCloudflare(
  masterPassword: string,
  email: string,
  apiKey: string,
): Promise<void> {
  return invoke("cloudflare_save", { master_password: masterPassword, email, api_key: apiKey });
}

export async function clearCloudflare(masterPassword: string): Promise<void> {
  return invoke("cloudflare_clear", { master_password: masterPassword });
}

export async function testDnspod(tokenId: string, token: string): Promise<IntegrationTestResult> {
  return invoke("dnspod_test", { token_id: tokenId, token });
}

export async function saveDnspod(
  masterPassword: string,
  tokenId: string,
  token: string,
): Promise<void> {
  return invoke("dnspod_save", { master_password: masterPassword, token_id: tokenId, token });
}

export async function clearDnspod(masterPassword: string): Promise<void> {
  return invoke("dnspod_clear", { master_password: masterPassword });
}

export async function listDomains(
  masterPassword: string,
  providerFilter: Provider | null,
  search: string,
): Promise<DomainItem[]> {
  return invoke("domains_list", {
    master_password: masterPassword,
    provider_filter: providerFilter ?? undefined,
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
    master_password: masterPassword,
    provider,
    domain_id: domainId,
    domain_name: domainName,
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
    master_password: masterPassword,
    provider,
    domain_id: domainId,
    domain_name: domainName,
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
    master_password: masterPassword,
    provider,
    domain_id: domainId,
    domain_name: domainName,
    req,
  });
}

export async function deleteRecord(
  masterPassword: string,
  provider: Provider,
  domainId: string,
  recordId: string,
): Promise<void> {
  return invoke("record_delete", {
    master_password: masterPassword,
    provider,
    domain_id: domainId,
    record_id: recordId,
  });
}
