use crate::error::AppError;
use crate::types::{DnsRecord, DomainItem, DomainStatus, Provider, RecordCreateRequest, RecordUpdateRequest};
use chrono::{DateTime, Utc};
use reqwest::header::{HeaderMap, HeaderValue};
use serde::Deserialize;
use std::time::Duration;

const API_BASE: &str = "https://dns.cn-north-4.myhuaweicloud.com";

pub struct HuaweiClient {
    client: reqwest::Client,
    token: String,
}

impl HuaweiClient {
    pub fn new(token: String) -> Result<Self, AppError> {
        let client = reqwest::Client::builder()
            .user_agent("LaoChenDNS/0.1.0")
            .timeout(Duration::from_secs(30))
            .build()
            .map_err(AppError::from)?;
        Ok(Self { client, token })
    }

    fn headers(&self) -> Result<HeaderMap, AppError> {
        let mut headers = HeaderMap::new();
        headers.insert(
            "X-Auth-Token",
            HeaderValue::from_str(&self.token).map_err(|e| AppError::new("invalid_input", e.to_string()))?,
        );
        Ok(headers)
    }

    pub async fn test(&self) -> Result<(), AppError> {
        let _ = self.list_domains().await?;
        Ok(())
    }

    pub async fn list_domains(&self) -> Result<Vec<DomainItem>, AppError> {
        let url = format!("{API_BASE}/v2/zones?type=public&limit=500");
        let res = self
            .client
            .get(url)
            .headers(self.headers()?)
            .send()
            .await
            .map_err(AppError::from)?;
        let parsed: HuaweiZoneListResponse = res.json().await.map_err(AppError::from)?;
        let mut items = Vec::new();
        for zone in parsed.zones.unwrap_or_default() {
            items.push(DomainItem {
                provider: Provider::Huawei,
                name: zone.name.trim_end_matches('.').to_string(),
                provider_id: zone.id.clone(),
                status: DomainStatus::Ok,
                records_count: zone.record_num,
                last_changed_at: zone.update_at.and_then(|s| parse_huawei_time(&s).ok()).map(|d| d.to_rfc3339()),
            });
        }
        Ok(items)
    }

    pub async fn list_records(&self, zone_id: &str, domain_name: &str) -> Result<Vec<DnsRecord>, AppError> {
        let url = format!("{API_BASE}/v2/zones/{zone_id}/recordsets?limit=500");
        let res = self
            .client
            .get(url)
            .headers(self.headers()?)
            .send()
            .await
            .map_err(AppError::from)?;
        let parsed: HuaweiRecordsetListResponse = res.json().await.map_err(AppError::from)?;
        let mut items = Vec::new();
        for recordset in parsed.recordsets.unwrap_or_default() {
            let raw_value = recordset.records.get(0).cloned().unwrap_or_default();
            let (content, srv_priority, srv_weight, srv_port, caa_flags, caa_tag) =
                parse_huawei_record_value(&recordset.record_type, &raw_value);
            items.push(DnsRecord {
                id: recordset.id,
                provider: Provider::Huawei,
                domain: domain_name.to_string(),
                record_type: recordset.record_type,
                name: huawei_rr(&recordset.name, domain_name),
                content,
                ttl: recordset.ttl,
                mx_priority: recordset.priority,
                srv_priority,
                srv_weight,
                srv_port,
                caa_flags,
                caa_tag,
            });
        }
        Ok(items)
    }

    pub async fn create_record(&self, zone_id: &str, domain_name: &str, req: &RecordCreateRequest) -> Result<DnsRecord, AppError> {
        let url = format!("{API_BASE}/v2/zones/{zone_id}/recordsets");
        let value = huawei_value(
            &req.record_type,
            &req.content,
            req.srv_priority,
            req.srv_weight,
            req.srv_port,
            req.caa_flags,
            req.caa_tag.as_deref(),
        );
        let payload = HuaweiRecordsetCreateRequest {
            name: huawei_full_name(domain_name, &req.name),
            record_type: req.record_type.clone(),
            ttl: req.ttl,
            records: vec![value],
        };
        let res = self
            .client
            .post(url)
            .headers(self.headers()?)
            .json(&payload)
            .send()
            .await
            .map_err(AppError::from)?;
        let parsed: HuaweiRecordset = res.json().await.map_err(AppError::from)?;
        let (content, srv_priority, srv_weight, srv_port, caa_flags, caa_tag) =
            parse_huawei_record_value(&parsed.record_type, &req.content);
        Ok(DnsRecord {
            id: parsed.id,
            provider: Provider::Huawei,
            domain: domain_name.to_string(),
            record_type: parsed.record_type,
            name: huawei_rr(&parsed.name, domain_name),
            content,
            ttl: parsed.ttl,
            mx_priority: parsed.priority,
            srv_priority,
            srv_weight,
            srv_port,
            caa_flags,
            caa_tag,
        })
    }

    pub async fn update_record(&self, zone_id: &str, domain_name: &str, req: &RecordUpdateRequest) -> Result<DnsRecord, AppError> {
        let url = format!("{API_BASE}/v2/zones/{zone_id}/recordsets/{}", req.id);
        let value = huawei_value(
            &req.record_type,
            &req.content,
            req.srv_priority,
            req.srv_weight,
            req.srv_port,
            req.caa_flags,
            req.caa_tag.as_deref(),
        );
        let payload = HuaweiRecordsetCreateRequest {
            name: huawei_full_name(domain_name, &req.name),
            record_type: req.record_type.clone(),
            ttl: req.ttl,
            records: vec![value],
        };
        let res = self
            .client
            .put(url)
            .headers(self.headers()?)
            .json(&payload)
            .send()
            .await
            .map_err(AppError::from)?;
        let parsed: HuaweiRecordset = res.json().await.map_err(AppError::from)?;
        let (content, srv_priority, srv_weight, srv_port, caa_flags, caa_tag) =
            parse_huawei_record_value(&parsed.record_type, &req.content);
        Ok(DnsRecord {
            id: parsed.id,
            provider: Provider::Huawei,
            domain: domain_name.to_string(),
            record_type: parsed.record_type,
            name: huawei_rr(&parsed.name, domain_name),
            content,
            ttl: parsed.ttl,
            mx_priority: parsed.priority,
            srv_priority,
            srv_weight,
            srv_port,
            caa_flags,
            caa_tag,
        })
    }

    pub async fn delete_record(&self, zone_id: &str, record_id: &str) -> Result<(), AppError> {
        let url = format!("{API_BASE}/v2/zones/{zone_id}/recordsets/{record_id}");
        let res = self
            .client
            .delete(url)
            .headers(self.headers()?)
            .send()
            .await
            .map_err(AppError::from)?;
        if !res.status().is_success() {
            let status = res.status();
            let text = res.text().await.unwrap_or_default();
            return Err(AppError::new(
                "delete_failed",
                format!(
                    "HTTP {}: {} (response text: {})",
                    status.as_u16(),
                    status.canonical_reason().unwrap_or("Unknown"),
                    text
                ),
            ));
        }
        Ok(())
    }
}

fn parse_huawei_time(value: &str) -> Result<DateTime<Utc>, anyhow::Error> {
    let dt = chrono::DateTime::parse_from_rfc3339(value)?;
    Ok(dt.with_timezone(&Utc))
}

fn huawei_full_name(domain_name: &str, host: &str) -> String {
    if host == "@" {
        format!("{}.", domain_name.trim_end_matches('.'))
    } else if host.ends_with(domain_name) {
        if host.ends_with('.') {
            host.to_string()
        } else {
            format!("{}.", host)
        }
    } else {
        format!("{}.{}.", host, domain_name.trim_end_matches('.'))
    }
}

fn huawei_rr(full_name: &str, domain_name: &str) -> String {
    let normalized = full_name.trim_end_matches('.').to_string();
    let suffix = format!(".{}", domain_name.trim_end_matches('.'));
    if normalized == domain_name.trim_end_matches('.') {
        "@".to_string()
    } else if normalized.ends_with(&suffix) {
        normalized.trim_end_matches(&suffix).to_string()
    } else {
        normalized
    }
}

#[derive(Debug, Deserialize)]
struct HuaweiZoneListResponse {
    zones: Option<Vec<HuaweiZone>>,
}

#[derive(Debug, Deserialize)]
struct HuaweiZone {
    id: String,
    name: String,
    record_num: Option<u32>,
    update_at: Option<String>,
}

#[derive(Debug, Deserialize)]
struct HuaweiRecordsetListResponse {
    recordsets: Option<Vec<HuaweiRecordset>>,
}

#[derive(Debug, Deserialize)]
struct HuaweiRecordset {
    id: String,
    name: String,
    #[serde(rename = "type")]
    record_type: String,
    ttl: u32,
    records: Vec<String>,
    priority: Option<u16>,
}

#[derive(Debug, serde::Serialize)]
struct HuaweiRecordsetCreateRequest {
    name: String,
    #[serde(rename = "type")]
    record_type: String,
    ttl: u32,
    records: Vec<String>,
}

fn huawei_value(
    record_type: &str,
    content: &str,
    srv_priority: Option<u16>,
    srv_weight: Option<u16>,
    srv_port: Option<u16>,
    caa_flags: Option<u8>,
    caa_tag: Option<&str>,
) -> String {
    match record_type {
        "SRV" => format!(
            "{} {} {} {}",
            srv_priority.unwrap_or(0),
            srv_weight.unwrap_or(0),
            srv_port.unwrap_or(0),
            content
        ),
        "CAA" => format!(
            "{} {} {}",
            caa_flags.unwrap_or(0),
            caa_tag.unwrap_or("issue"),
            content
        ),
        _ => content.to_string(),
    }
}

fn parse_huawei_record_value(
    record_type: &str,
    value: &str,
) -> (String, Option<u16>, Option<u16>, Option<u16>, Option<u8>, Option<String>) {
    match record_type {
        "SRV" => {
            let parts: Vec<&str> = value.split_whitespace().collect();
            if parts.len() >= 4 {
                let srv_priority = parts[0].parse::<u16>().ok();
                let srv_weight = parts[1].parse::<u16>().ok();
                let srv_port = parts[2].parse::<u16>().ok();
                let content = parts[3..].join(" ");
                (content, srv_priority, srv_weight, srv_port, None, None)
            } else {
                (value.to_string(), None, None, None, None, None)
            }
        }
        "CAA" => {
            let parts: Vec<&str> = value.split_whitespace().collect();
            if parts.len() >= 3 {
                let flags = parts[0].parse::<u8>().ok();
                let tag = Some(parts[1].to_string());
                let content = parts[2..].join(" ");
                (content, None, None, None, flags, tag)
            } else {
                (value.to_string(), None, None, None, None, None)
            }
        }
        _ => (value.to_string(), None, None, None, None, None),
    }
}
