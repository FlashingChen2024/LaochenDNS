use crate::error::AppError;
use crate::types::{DnsRecord, DomainItem, DomainStatus, Provider, RecordCreateRequest, RecordUpdateRequest};
use anyhow::Context;
use chrono::{DateTime, Utc};
use reqwest::header::{HeaderMap, HeaderValue};
use serde::Deserialize;

const API_BASE: &str = "https://api.cloudflare.com/client/v4";

pub struct CloudflareClient {
    client: reqwest::Client,
    email: String,
    api_key: String,
}

impl CloudflareClient {
    pub fn new(email: String, api_key: String) -> Result<Self, AppError> {
        let client = reqwest::Client::builder()
            .user_agent("LaoChenDNS/0.1.0")
            .build()
            .map_err(AppError::from)?;

        Ok(Self {
            client,
            email,
            api_key,
        })
    }

    fn headers(&self) -> Result<HeaderMap, AppError> {
        let mut headers = HeaderMap::new();
        headers.insert(
            "X-Auth-Email",
            HeaderValue::from_str(&self.email).map_err(|e| AppError::new("invalid_input", e.to_string()))?,
        );
        headers.insert(
            "X-Auth-Key",
            HeaderValue::from_str(&self.api_key).map_err(|e| AppError::new("invalid_input", e.to_string()))?,
        );
        Ok(headers)
    }

    pub async fn test(&self) -> Result<(), AppError> {
        let url = format!("{API_BASE}/zones?per_page=1");
        let res = self
            .client
            .get(url)
            .headers(self.headers()?)
            .send()
            .await
            .map_err(AppError::from)?;
        let parsed: CfResponse<Vec<CfZone>> = res.json().await.map_err(AppError::from)?;
        if parsed.success {
            Ok(())
        } else {
            Err(AppError::new("auth_failed", parsed.first_error_message()))
        }
    }

    pub async fn list_domains(&self) -> Result<Vec<DomainItem>, AppError> {
        let url = format!("{API_BASE}/zones?per_page=200");
        let res = self
            .client
            .get(url)
            .headers(self.headers()?)
            .send()
            .await
            .map_err(AppError::from)?;
        let parsed: CfResponse<Vec<CfZone>> = res.json().await.map_err(AppError::from)?;
        if !parsed.success {
            return Err(AppError::new("fetch_failed", parsed.first_error_message()));
        }

        let mut items = Vec::new();
        for zone in parsed.result {
            let records_count = self.zone_records_count(&zone.id).await.ok().flatten();
            items.push(DomainItem {
                provider: Provider::Cloudflare,
                name: zone.name,
                provider_id: zone.id,
                status: DomainStatus::Ok,
                records_count,
                last_changed_at: zone
                    .modified_on
                    .and_then(|s| parse_rfc3339(&s).ok())
                    .map(|d| d.to_rfc3339()),
            });
        }
        Ok(items)
    }

    async fn zone_records_count(&self, zone_id: &str) -> Result<Option<u32>, AppError> {
        let url = format!("{API_BASE}/zones/{zone_id}/dns_records?per_page=1");
        let res = self
            .client
            .get(url)
            .headers(self.headers()?)
            .send()
            .await
            .map_err(AppError::from)?;
        let parsed: CfResponse<Vec<CfDnsRecord>> = res.json().await.map_err(AppError::from)?;
        if !parsed.success {
            return Err(AppError::new("fetch_failed", parsed.first_error_message()));
        }
        Ok(parsed.result_info.and_then(|i| i.total_count))
    }

    pub async fn list_records(&self, zone_id: &str, zone_name: &str) -> Result<Vec<DnsRecord>, AppError> {
        let url = format!("{API_BASE}/zones/{zone_id}/dns_records?per_page=50000");
        let res = self
            .client
            .get(url)
            .headers(self.headers()?)
            .send()
            .await
            .map_err(AppError::from)?;
        let parsed: CfResponse<Vec<CfDnsRecord>> = res.json().await.map_err(AppError::from)?;
        if !parsed.success {
            return Err(AppError::new("fetch_failed", parsed.first_error_message()));
        }

        Ok(parsed
            .result
            .into_iter()
            .filter_map(|r| r.to_dns_record(zone_name).ok())
            .collect())
    }

    pub async fn find_conflict_ids(&self, zone_id: &str, zone_name: &str, record_type: &str, host: &str) -> Result<Vec<String>, AppError> {
        let full_name = normalize_full_name(zone_name, host);
        let url = format!(
            "{API_BASE}/zones/{zone_id}/dns_records?per_page=100&type={}&name={}",
            urlencoding::encode(record_type),
            urlencoding::encode(&full_name)
        );
        let res = self
            .client
            .get(url)
            .headers(self.headers()?)
            .send()
            .await
            .map_err(AppError::from)?;
        let parsed: CfResponse<Vec<CfDnsRecord>> = res.json().await.map_err(AppError::from)?;
        if !parsed.success {
            return Err(AppError::new("fetch_failed", parsed.first_error_message()));
        }
        Ok(parsed.result.into_iter().map(|r| r.id).collect())
    }

    pub async fn create_record(&self, zone_id: &str, zone_name: &str, req: &RecordCreateRequest) -> Result<DnsRecord, AppError> {
        let url = format!("{API_BASE}/zones/{zone_id}/dns_records");
        let payload = build_cf_record_payload(zone_name, req);
        let res = self
            .client
            .post(url)
            .headers(self.headers()?)
            .json(&payload)
            .send()
            .await
            .map_err(AppError::from)?;
        let parsed: CfResponse<CfDnsRecord> = res.json().await.map_err(AppError::from)?;
        if !parsed.success {
            return Err(AppError::new("create_failed", parsed.first_error_message()));
        }
        parsed
            .result
            .to_dns_record(zone_name)
            .context("convert record")
            .map_err(AppError::from)
    }

    pub async fn update_record(&self, zone_id: &str, zone_name: &str, req: &RecordUpdateRequest) -> Result<DnsRecord, AppError> {
        let url = format!("{API_BASE}/zones/{zone_id}/dns_records/{}", req.id);
        let payload = build_cf_record_payload_update(zone_name, req);
        let res = self
            .client
            .put(url)
            .headers(self.headers()?)
            .json(&payload)
            .send()
            .await
            .map_err(AppError::from)?;
        let parsed: CfResponse<CfDnsRecord> = res.json().await.map_err(AppError::from)?;
        if !parsed.success {
            return Err(AppError::new("update_failed", parsed.first_error_message()));
        }
        parsed
            .result
            .to_dns_record(zone_name)
            .context("convert record")
            .map_err(AppError::from)
    }

    pub async fn delete_record(&self, zone_id: &str, record_id: &str) -> Result<(), AppError> {
        let url = format!("{API_BASE}/zones/{zone_id}/dns_records/{record_id}");
        let res = self
            .client
            .delete(url)
            .headers(self.headers()?)
            .send()
            .await
            .map_err(AppError::from)?;
        let parsed: CfResponse<serde_json::Value> = res.json().await.map_err(AppError::from)?;
        if !parsed.success {
            return Err(AppError::new("delete_failed", parsed.first_error_message()));
        }
        Ok(())
    }
}

fn normalize_full_name(zone_name: &str, host: &str) -> String {
    if host == "@" || host == zone_name {
        zone_name.to_string()
    } else if host.ends_with(&format!(".{zone_name}")) || host == format!("{host}.{zone_name}") {
        host.to_string()
    } else {
        format!("{host}.{zone_name}")
    }
}

fn parse_rfc3339(value: &str) -> Result<DateTime<Utc>, anyhow::Error> {
    Ok(DateTime::parse_from_rfc3339(value)?.with_timezone(&Utc))
}

#[derive(Debug, Deserialize)]
struct CfResponse<T> {
    success: bool,
    result: T,
    errors: Option<Vec<CfError>>,
    result_info: Option<CfResultInfo>,
}

impl<T> CfResponse<T> {
    fn first_error_message(&self) -> String {
        self.errors
            .as_ref()
            .and_then(|e| e.first())
            .map(|e| e.message.clone())
            .unwrap_or_else(|| "Unknown error".to_string())
    }
}

#[derive(Debug, Deserialize)]
struct CfError {
    message: String,
}

#[derive(Debug, Deserialize)]
struct CfResultInfo {
    total_count: Option<u32>,
}

#[derive(Debug, Deserialize)]
struct CfZone {
    id: String,
    name: String,
    modified_on: Option<String>,
}

#[derive(Debug, Deserialize)]
struct CfDnsRecord {
    id: String,
    #[serde(rename = "type")]
    record_type: String,
    name: String,
    content: Option<String>,
    ttl: u32,
    priority: Option<u16>,
    data: Option<serde_json::Value>,
}

impl CfDnsRecord {
    fn to_dns_record(self, zone_name: &str) -> Result<DnsRecord, anyhow::Error> {
        let host = if self.name == zone_name {
            "@".to_string()
        } else if let Some(stripped) = self.name.strip_suffix(&format!(".{zone_name}")) {
            stripped.to_string()
        } else {
            self.name.clone()
        };

        let mut out = DnsRecord {
            id: self.id,
            provider: Provider::Cloudflare,
            domain: zone_name.to_string(),
            record_type: self.record_type.clone(),
            name: host,
            content: self.content.clone().unwrap_or_default(),
            ttl: self.ttl,
            mx_priority: None,
            srv_priority: None,
            srv_weight: None,
            srv_port: None,
            caa_flags: None,
            caa_tag: None,
        };

        match self.record_type.as_str() {
            "MX" => {
                out.mx_priority = self.priority;
            }
            "SRV" => {
                if let Some(data) = self.data {
                    out.srv_priority = data.get("priority").and_then(|v| v.as_u64()).map(|v| v as u16);
                    out.srv_weight = data.get("weight").and_then(|v| v.as_u64()).map(|v| v as u16);
                    out.srv_port = data.get("port").and_then(|v| v.as_u64()).map(|v| v as u16);
                    if let Some(target) = data.get("target").and_then(|v| v.as_str()) {
                        out.content = target.to_string();
                    }
                }
            }
            "CAA" => {
                if let Some(data) = self.data {
                    out.caa_flags = data.get("flags").and_then(|v| v.as_u64()).map(|v| v as u8);
                    out.caa_tag = data.get("tag").and_then(|v| v.as_str()).map(|v| v.to_string());
                    if let Some(value) = data.get("value").and_then(|v| v.as_str()) {
                        out.content = value.to_string();
                    }
                }
            }
            _ => {}
        }

        Ok(out)
    }
}

#[derive(serde::Serialize)]
struct CfRecordPayload {
    #[serde(rename = "type")]
    record_type: String,
    name: String,
    content: Option<String>,
    ttl: u32,
    priority: Option<u16>,
    data: Option<serde_json::Value>,
}

fn build_cf_record_payload(zone_name: &str, req: &RecordCreateRequest) -> CfRecordPayload {
    build_cf_payload_common(zone_name, &req.record_type, &req.name, &req.content, req.ttl, req.mx_priority, req.srv_priority, req.srv_weight, req.srv_port, req.caa_flags, req.caa_tag.as_deref())
}

fn build_cf_record_payload_update(zone_name: &str, req: &RecordUpdateRequest) -> CfRecordPayload {
    build_cf_payload_common(zone_name, &req.record_type, &req.name, &req.content, req.ttl, req.mx_priority, req.srv_priority, req.srv_weight, req.srv_port, req.caa_flags, req.caa_tag.as_deref())
}

fn build_cf_payload_common(
    zone_name: &str,
    record_type: &str,
    host: &str,
    content: &str,
    ttl: u32,
    mx_priority: Option<u16>,
    srv_priority: Option<u16>,
    srv_weight: Option<u16>,
    srv_port: Option<u16>,
    caa_flags: Option<u8>,
    caa_tag: Option<&str>,
) -> CfRecordPayload {
    let full_name = normalize_full_name(zone_name, host);
    match record_type {
        "SRV" => {
            let (service, proto) = parse_srv_service_proto(host);
            CfRecordPayload {
                record_type: record_type.to_string(),
                name: full_name,
                content: None,
                ttl,
                priority: None,
                data: Some(serde_json::json!({
                    "service": service,
                    "proto": proto,
                    "name": zone_name,
                    "priority": srv_priority.unwrap_or(0),
                    "weight": srv_weight.unwrap_or(0),
                    "port": srv_port.unwrap_or(0),
                    "target": content,
                })),
            }
        }
        "CAA" => CfRecordPayload {
            record_type: record_type.to_string(),
            name: full_name,
            content: None,
            ttl,
            priority: None,
            data: Some(serde_json::json!({
                "flags": caa_flags.unwrap_or(0),
                "tag": caa_tag.unwrap_or("issue"),
                "value": content,
            })),
        },
        "MX" => CfRecordPayload {
            record_type: record_type.to_string(),
            name: full_name,
            content: Some(content.to_string()),
            ttl,
            priority: mx_priority,
            data: None,
        },
        _ => CfRecordPayload {
            record_type: record_type.to_string(),
            name: full_name,
            content: Some(content.to_string()),
            ttl,
            priority: None,
            data: None,
        },
    }
}

fn parse_srv_service_proto(host: &str) -> (String, String) {
    let parts: Vec<&str> = host.split('.').collect();
    if parts.len() >= 2 && parts[0].starts_with('_') && parts[1].starts_with('_') {
        (parts[0].to_string(), parts[1].to_string())
    } else {
        ("_service".to_string(), "_tcp".to_string())
    }
}
