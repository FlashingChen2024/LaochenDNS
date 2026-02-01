use crate::error::AppError;
use crate::types::{DnsRecord, DomainItem, DomainStatus, Provider, RecordCreateRequest, RecordUpdateRequest};
use anyhow::Context;
use chrono::{DateTime, Utc};
use reqwest::header::{HeaderMap, HeaderValue};
use serde::de::DeserializeOwned;
use serde::Deserialize;
use std::collections::HashMap;

const API_BASE: &str = "https://dnsapi.cn";

pub struct DnspodClient {
    client: reqwest::Client,
    token_id: String,
    token: String,
}

impl DnspodClient {
    pub fn new(token_id: String, token: String) -> Result<Self, AppError> {
        let client = reqwest::Client::builder()
            .user_agent("LaoChenDNS/0.1.0")
            .build()
            .map_err(AppError::from)?;
        Ok(Self {
            client,
            token_id,
            token,
        })
    }

    fn headers(&self) -> HeaderMap {
        let mut headers = HeaderMap::new();
        headers.insert(
            "Content-Type",
            HeaderValue::from_static("application/x-www-form-urlencoded"),
        );
        headers.insert(
            "login_token",
            HeaderValue::from_str(&self.login_token()).unwrap(),
        );
        headers
    }

    fn login_token(&self) -> String {
        format!("{},{}", self.token_id, self.token)
    }

    pub async fn test(&self) -> Result<(), AppError> {
        let _ = self.domain_list().await?;
        Ok(())
    }

    pub async fn list_domains(&self) -> Result<Vec<DomainItem>, AppError> {
        let domains = self.domain_list().await?;
        let mut items = Vec::new();
        for d in domains {
            items.push(DomainItem {
                provider: Provider::Dnspod,
                name: d.name.clone(),
                provider_id: d.id.to_string(),
                status: DomainStatus::Ok,
                records_count: d.records.parse::<u32>().ok(),
                last_changed_at: parse_ymd_hms(&d.updated_on).ok().map(|d| d.to_rfc3339()),
            });
        }
        Ok(items)
    }

    pub async fn list_records(&self, domain_id: &str, domain_name: &str) -> Result<Vec<DnsRecord>, AppError> {
        let url = format!("{API_BASE}/Record.List");
        let mut params = common_params(&self.login_token());
        params.insert("domain_id".to_string(), domain_id.to_string());
        let res = self
            .client
            .post(url)
            .headers(self.headers())
            .form(&params)
            .send()
            .await
            .map_err(AppError::from)?;
        let parsed: DnspodRecordListResponse = parse_response(res).await?;
        ensure_ok(&parsed.status)?;

        Ok(parsed
            .records
            .unwrap_or_default()
            .into_iter()
            .map(|r| r.to_dns_record(domain_name, None, None, None, None))
            .collect())
    }

    pub async fn create_record(&self, domain_id: &str, domain_name: &str, req: &RecordCreateRequest) -> Result<DnsRecord, AppError> {
        let url = format!("{API_BASE}/Record.Create");
        let mut params = common_params(&self.login_token());
        params.insert("domain_id".to_string(), domain_id.to_string());
        params.insert("sub_domain".to_string(), req.name.clone());
        params.insert("record_type".to_string(), req.record_type.clone());
        params.insert("record_line".to_string(), "默认".to_string());
        let value = dnspod_value(&req.record_type, &req.content, req.srv_priority, req.srv_weight, req.srv_port, req.caa_flags, req.caa_tag.as_deref());
        params.insert("value".to_string(), value.clone());
        params.insert("ttl".to_string(), req.ttl.to_string());
        if req.record_type == "MX" {
            if let Some(mx) = req.mx_priority {
                params.insert("mx".to_string(), mx.to_string());
            }
        }

        let res = self
            .client
            .post(url)
            .headers(self.headers())
            .form(&params)
            .send()
            .await
            .map_err(AppError::from)?;
        let parsed: DnspodRecordCreateResponse = parse_response(res).await?;
        ensure_ok(&parsed.status)?;

        let record = parsed
            .record
            .context("missing record")
            .map_err(AppError::from)?;
        Ok(record.to_dns_record(domain_name, Some(&req.record_type), Some(value), Some(req.ttl), req.mx_priority))
    }

    pub async fn update_record(&self, domain_id: &str, domain_name: &str, req: &RecordUpdateRequest) -> Result<DnsRecord, AppError> {
        let url = format!("{API_BASE}/Record.Modify");
        let mut params = common_params(&self.login_token());
        params.insert("domain_id".to_string(), domain_id.to_string());
        params.insert("record_id".to_string(), req.id.clone());
        params.insert("sub_domain".to_string(), req.name.clone());
        params.insert("record_type".to_string(), req.record_type.clone());
        params.insert("record_line".to_string(), "默认".to_string());
        let value = dnspod_value(&req.record_type, &req.content, req.srv_priority, req.srv_weight, req.srv_port, req.caa_flags, req.caa_tag.as_deref());
        params.insert("value".to_string(), value.clone());
        params.insert("ttl".to_string(), req.ttl.to_string());
        if req.record_type == "MX" {
            if let Some(mx) = req.mx_priority {
                params.insert("mx".to_string(), mx.to_string());
            }
        }

        let res = self
            .client
            .post(url)
            .headers(self.headers())
            .form(&params)
            .send()
            .await
            .map_err(AppError::from)?;
        let parsed: DnspodRecordModifyResponse = parse_response(res).await?;
        ensure_ok(&parsed.status)?;

        let record = parsed
            .record
            .context("missing record")
            .map_err(AppError::from)?;
        Ok(record.to_dns_record(domain_name, Some(&req.record_type), Some(value), Some(req.ttl), req.mx_priority))
    }

    pub async fn delete_record(&self, domain_id: &str, record_id: &str) -> Result<(), AppError> {
        let url = format!("{API_BASE}/Record.Remove");
        let mut params = common_params(&self.login_token());
        params.insert("domain_id".to_string(), domain_id.to_string());
        params.insert("record_id".to_string(), record_id.to_string());
        let res = self
            .client
            .post(url)
            .headers(self.headers())
            .form(&params)
            .send()
            .await
            .map_err(AppError::from)?;
        let parsed: DnspodStatusResponse = parse_response(res).await?;
        ensure_ok(&parsed.status)?;
        Ok(())
    }

    async fn domain_list(&self) -> Result<Vec<DnspodDomain>, AppError> {
        let url = format!("{API_BASE}/Domain.List");
        let params = common_params(&self.login_token());
        let res = self
            .client
            .post(url)
            .headers(self.headers())
            .form(&params)
            .send()
            .await
            .map_err(AppError::from)?;
        let parsed: DnspodDomainListResponse = parse_response(res).await?;
        ensure_ok(&parsed.status)?;
        Ok(parsed.domains.unwrap_or_default())
    }
}

fn common_params(login_token: &str) -> HashMap<String, String> {
    let mut params = HashMap::new();
    params.insert("login_token".to_string(), login_token.to_string());
    params.insert("format".to_string(), "json".to_string());
    params
}

fn ensure_ok(status: &DnspodStatus) -> Result<(), AppError> {
    if status.code == "1" {
        Ok(())
    } else {
        Err(AppError::new("auth_failed", status.message.clone()))
    }
}

async fn parse_response<T: DeserializeOwned>(res: reqwest::Response) -> Result<T, AppError> {
    let status = res.status();
    let text = res.text().await.map_err(AppError::from)?;
    if !status.is_success() {
        return Err(AppError::new(
            "http_error",
            format!(
                "HTTP {}: {} (response text: {})",
                status.as_u16(),
                status.canonical_reason().unwrap_or("Unknown"),
                text
            ),
        ));
    }
    serde_json::from_str::<T>(&text).map_err(|e| {
        AppError::new(
            "json_decode_failed",
            format!("Failed to decode response: {} (response text: {})", e, text),
        )
    })
}

fn parse_ymd_hms(value: &str) -> Result<DateTime<Utc>, anyhow::Error> {
    let dt = chrono::NaiveDateTime::parse_from_str(value, "%Y-%m-%d %H:%M:%S")?;
    Ok(DateTime::<Utc>::from_naive_utc_and_offset(dt, Utc))
}

fn dnspod_value(
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

#[derive(Debug, Deserialize)]
struct DnspodStatusResponse {
    status: DnspodStatus,
}

#[derive(Debug, Deserialize)]
struct DnspodDomainListResponse {
    status: DnspodStatus,
    domains: Option<Vec<DnspodDomain>>,
}

#[derive(Debug, Deserialize)]
struct DnspodRecordListResponse {
    status: DnspodStatus,
    records: Option<Vec<DnspodRecord>>,
}

#[derive(Debug, Deserialize)]
struct DnspodRecordCreateResponse {
    status: DnspodStatus,
    record: Option<DnspodRecord>,
}

#[derive(Debug, Deserialize)]
struct DnspodRecordModifyResponse {
    status: DnspodStatus,
    record: Option<DnspodRecord>,
}

#[derive(Debug, Deserialize)]
struct DnspodStatus {
    code: String,
    message: String,
}

#[derive(Debug, Deserialize)]
struct DnspodDomain {
    id: u64,
    name: String,
    records: String,
    updated_on: String,
}

#[derive(Debug, Deserialize)]
struct DnspodRecord {
    id: String,
    name: String,
    #[serde(rename = "type")]
    record_type: Option<String>,
    value: Option<String>,
    ttl: Option<String>,
    mx: Option<String>,
}

impl DnspodRecord {
    fn to_dns_record(
        self,
        domain_name: &str,
        default_record_type: Option<&str>,
        default_value: Option<String>,
        default_ttl: Option<u32>,
        default_mx: Option<u16>,
    ) -> DnsRecord {
        let record_type = self
            .record_type
            .or_else(|| default_record_type.map(|v| v.to_string()))
            .unwrap_or_else(|| "A".to_string());
        let value = self.value.or(default_value).unwrap_or_default();
        let (content, srv_priority, srv_weight, srv_port) = if record_type == "SRV" {
            let parts: Vec<&str> = value.split_whitespace().collect();
            if parts.len() >= 4 {
                (
                    parts[3..].join(" "),
                    parts[0].parse::<u16>().ok(),
                    parts[1].parse::<u16>().ok(),
                    parts[2].parse::<u16>().ok(),
                )
            } else {
                (value.clone(), None, None, None)
            }
        } else {
            (value.clone(), None, None, None)
        };

        let (caa_flags, caa_tag, caa_value) = if record_type == "CAA" {
            let parts: Vec<&str> = value.split_whitespace().collect();
            if parts.len() >= 3 {
                (
                    parts[0].parse::<u8>().ok(),
                    Some(parts[1].to_string()),
                    parts[2..].join(" "),
                )
            } else {
                (None, None, value.clone())
            }
        } else {
            (None, None, content.clone())
        };

        DnsRecord {
            id: self.id,
            provider: Provider::Dnspod,
            domain: domain_name.to_string(),
            record_type,
            name: self.name,
            content: caa_value,
            ttl: self
                .ttl
                .and_then(|v| v.parse::<u32>().ok())
                .or(default_ttl)
                .unwrap_or(600),
            mx_priority: self.mx.and_then(|v| v.parse::<u16>().ok()).or(default_mx),
            srv_priority,
            srv_weight,
            srv_port,
            caa_flags,
            caa_tag,
        }
    }
}
