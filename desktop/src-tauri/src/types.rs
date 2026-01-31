use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum Provider {
    Cloudflare,
    Dnspod,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VaultStatus {
    pub initialized: bool,
    pub cloudflare_configured: bool,
    pub dnspod_configured: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct IntegrationsInfo {
    pub cloudflare: IntegrationInfoItem,
    pub dnspod: IntegrationInfoItem,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct IntegrationInfoItem {
    pub configured: bool,
    pub last_verified_at: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct IntegrationTestResult {
    pub ok: bool,
    pub message: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DomainItem {
    pub provider: Provider,
    pub name: String,
    pub provider_id: String,
    pub status: DomainStatus,
    pub records_count: Option<u32>,
    pub last_changed_at: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum DomainStatus {
    Ok,
    AuthFailed,
    Unreachable,
    FetchFailed,
    NotConfigured,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DnsRecord {
    pub id: String,
    pub provider: Provider,
    pub domain: String,
    pub record_type: String,
    pub name: String,
    pub content: String,
    pub ttl: u32,
    pub mx_priority: Option<u16>,
    pub srv_priority: Option<u16>,
    pub srv_weight: Option<u16>,
    pub srv_port: Option<u16>,
    pub caa_flags: Option<u8>,
    pub caa_tag: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum ConflictStrategy {
    DoNotCreate,
    Overwrite,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RecordCreateRequest {
    pub record_type: String,
    pub name: String,
    pub content: String,
    pub ttl: u32,
    pub conflict_strategy: ConflictStrategy,
    pub mx_priority: Option<u16>,
    pub srv_priority: Option<u16>,
    pub srv_weight: Option<u16>,
    pub srv_port: Option<u16>,
    pub caa_flags: Option<u8>,
    pub caa_tag: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RecordUpdateRequest {
    pub id: String,
    pub record_type: String,
    pub name: String,
    pub content: String,
    pub ttl: u32,
    pub mx_priority: Option<u16>,
    pub srv_priority: Option<u16>,
    pub srv_weight: Option<u16>,
    pub srv_port: Option<u16>,
    pub caa_flags: Option<u8>,
    pub caa_tag: Option<String>,
}

