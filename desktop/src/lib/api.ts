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
  recordId: string,
): Promise<void> {
  return invoke("record_delete", {
    masterPassword,
    provider,
    domainId,
    recordId,
  });
}
