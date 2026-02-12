use crate::error::AppError;
use crate::types::{DnsRecord, DomainItem, DomainStatus, Provider, RecordCreateRequest, RecordUpdateRequest};
use chrono::{DateTime, Utc};
use hmac::{Hmac, Mac};
use reqwest::header::{HeaderMap, HeaderValue};
use serde::Deserialize;
use sha2::Sha256;
use std::collections::BTreeMap;
use std::time::Duration;

const API_BASE: &str = "https://dns.baidubce.com";
const SIGN_EXPIRES: u32 = 1800;

pub struct BaiduClient {
    client: reqwest::Client,
    access_key_id: String,
    secret_access_key: String,
}

impl BaiduClient {
    pub fn new(access_key_id: String, secret_access_key: String) -> Result<Self, AppError> {
        let client = reqwest::Client::builder()
            .user_agent("LaoChenDNS/0.1.0")
            .timeout(Duration::from_secs(30))
            .build()
            .map_err(AppError::from)?;
        Ok(Self {
            client,
            access_key_id,
            secret_access_key,
        })
    }

    pub async fn test(&self) -> Result<(), AppError> {
        let _ = self.list_domains().await?;
        Ok(())
    }

    pub async fn list_domains(&self) -> Result<Vec<DomainItem>, AppError> {
        let url = format!("{API_BASE}/v1/zone");
        let headers = self.base_headers("GET", "/v1/zone", &BTreeMap::new())?;
        let res = self
            .client
            .get(url)
            .headers(headers)
            .send()
            .await
            .map_err(AppError::from)?;
        let parsed: BaiduZoneListResponse = res.json().await.map_err(AppError::from)?;
        let mut items = Vec::new();
        for zone in parsed.zones.unwrap_or_default() {
            items.push(DomainItem {
                provider: Provider::Baidu,
                name: zone.name.clone(),
                provider_id: zone.id.clone(),
                status: DomainStatus::Ok,
                records_count: zone.record_count,
                last_changed_at: zone
                    .update_time
                    .as_deref()
                    .and_then(|s| parse_baidu_time(s).ok())
                    .map(|d| d.to_rfc3339()),
            });
        }
        Ok(items)
    }

    pub async fn list_records(&self, zone_id: &str, domain_name: &str) -> Result<Vec<DnsRecord>, AppError> {
        let path = format!("/v1/zone/{zone_id}/record");
        let url = format!("{API_BASE}{path}");
        let headers = self.base_headers("GET", &path, &BTreeMap::new())?;
        let res = self
            .client
            .get(url)
            .headers(headers)
            .send()
            .await
            .map_err(AppError::from)?;
        let parsed: BaiduRecordListResponse = res.json().await.map_err(AppError::from)?;
        let mut items = Vec::new();
        for record in parsed.records.unwrap_or_default() {
            items.push(record.to_dns_record(domain_name));
        }
        Ok(items)
    }

    pub async fn create_record(&self, zone_id: &str, domain_name: &str, req: &RecordCreateRequest) -> Result<DnsRecord, AppError> {
        let path = format!("/v1/zone/{zone_id}/record");
        let url = format!("{API_BASE}{path}");
        let value = baidu_value(
            &req.record_type,
            &req.content,
            req.srv_priority,
            req.srv_weight,
            req.srv_port,
            req.caa_flags,
            req.caa_tag.as_deref(),
        );
        let payload = BaiduRecordCreateRequest {
            rr: req.name.clone(),
            record_type: req.record_type.clone(),
            value,
            ttl: req.ttl,
            priority: req.mx_priority,
        };
        let headers = self.base_headers("POST", &path, &BTreeMap::new())?;
        let res = self
            .client
            .post(url)
            .headers(headers)
            .json(&payload)
            .send()
            .await
            .map_err(AppError::from)?;
        let parsed: BaiduRecord = res.json().await.map_err(AppError::from)?;
        let (content, srv_priority, srv_weight, srv_port, caa_flags, caa_tag) =
            parse_baidu_record_value(&req.record_type, &req.content);
        Ok(DnsRecord {
            id: parsed.id,
            provider: Provider::Baidu,
            domain: domain_name.to_string(),
            record_type: parsed.record_type,
            name: parsed.rr,
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
        let path = format!("/v1/zone/{zone_id}/record/{}", req.id);
        let url = format!("{API_BASE}{path}");
        let value = baidu_value(
            &req.record_type,
            &req.content,
            req.srv_priority,
            req.srv_weight,
            req.srv_port,
            req.caa_flags,
            req.caa_tag.as_deref(),
        );
        let payload = BaiduRecordCreateRequest {
            rr: req.name.clone(),
            record_type: req.record_type.clone(),
            value,
            ttl: req.ttl,
            priority: req.mx_priority,
        };
        let headers = self.base_headers("PUT", &path, &BTreeMap::new())?;
        let res = self
            .client
            .put(url)
            .headers(headers)
            .json(&payload)
            .send()
            .await
            .map_err(AppError::from)?;
        let parsed: BaiduRecord = res.json().await.map_err(AppError::from)?;
        let (content, srv_priority, srv_weight, srv_port, caa_flags, caa_tag) =
            parse_baidu_record_value(&req.record_type, &req.content);
        Ok(DnsRecord {
            id: parsed.id,
            provider: Provider::Baidu,
            domain: domain_name.to_string(),
            record_type: parsed.record_type,
            name: parsed.rr,
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
        let path = format!("/v1/zone/{zone_id}/record/{record_id}");
        let url = format!("{API_BASE}{path}");
        let headers = self.base_headers("DELETE", &path, &BTreeMap::new())?;
        let res = self
            .client
            .delete(url)
            .headers(headers)
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

    fn base_headers(&self, method: &str, path: &str, query: &BTreeMap<String, String>) -> Result<HeaderMap, AppError> {
        let host = "dns.baidubce.com";
        let timestamp = Utc::now().format("%Y-%m-%dT%H:%M:%SZ").to_string();
        let mut headers = HeaderMap::new();
        headers.insert("host", HeaderValue::from_static(host));
        headers.insert(
            "x-bce-date",
            HeaderValue::from_str(&timestamp).map_err(|e| AppError::new("invalid_header", e.to_string()))?,
        );
        let authorization = self.sign(method, path, query, &headers, &timestamp)?;
        headers.insert(
            "Authorization",
            HeaderValue::from_str(&authorization).map_err(|e| AppError::new("invalid_header", e.to_string()))?,
        );
        Ok(headers)
    }

    fn sign(
        &self,
        method: &str,
        path: &str,
        query: &BTreeMap<String, String>,
        headers: &HeaderMap,
        timestamp: &str,
    ) -> Result<String, AppError> {
        let auth_string = format!("bce-auth-v1/{}/{}/{}", self.access_key_id, timestamp, SIGN_EXPIRES);
        let signing_key = hmac_sha256(self.secret_access_key.as_bytes(), auth_string.as_bytes());
        let canonical_uri = percent_encode(path);
        let canonical_query = canonical_query_string(query);
        let canonical_headers = canonical_headers(headers);
        let signed_headers = "host;x-bce-date";
        let string_to_sign = format!(
            "{}\n{}\n{}\n{}",
            method.to_uppercase(),
            canonical_uri,
            canonical_query,
            canonical_headers
        );
        let signature = hmac_sha256_hex(&signing_key, string_to_sign.as_bytes());
        Ok(format!(
            "{}//{}/{}",
            auth_string, signed_headers, signature
        ))
    }
}

fn percent_encode(value: &str) -> String {
    urlencoding::encode(value)
        .into_owned()
        .replace('+', "%20")
        .replace('*', "%2A")
        .replace("%7E", "~")
}

fn canonical_query_string(params: &BTreeMap<String, String>) -> String {
    let mut items = Vec::new();
    for (k, v) in params {
        items.push(format!("{}={}", percent_encode(k), percent_encode(v)));
    }
    items.join("&")
}

fn canonical_headers(headers: &HeaderMap) -> String {
    let mut items: Vec<(String, String)> = headers
        .iter()
        .map(|(k, v)| {
            let value = v.to_str().unwrap_or("").trim().to_string();
            (k.as_str().to_lowercase(), value)
        })
        .collect();
    items.sort_by(|a, b| a.0.cmp(&b.0));
    items
        .into_iter()
        .map(|(k, v)| format!("{}:{}", percent_encode(&k), percent_encode(&v)))
        .collect::<Vec<String>>()
        .join("\n")
}

fn hmac_sha256(key: &[u8], data: &[u8]) -> Vec<u8> {
    let mut mac = Hmac::<Sha256>::new_from_slice(key).expect("hmac can take key of any size");
    mac.update(data);
    mac.finalize().into_bytes().to_vec()
}

fn hmac_sha256_hex(key: &[u8], data: &[u8]) -> String {
    let mut mac = Hmac::<Sha256>::new_from_slice(key).expect("hmac can take key of any size");
    mac.update(data);
    hex::encode(mac.finalize().into_bytes())
}

fn parse_baidu_time(value: &str) -> Result<DateTime<Utc>, anyhow::Error> {
    let dt = chrono::DateTime::parse_from_rfc3339(value)?;
    Ok(dt.with_timezone(&Utc))
}

#[derive(Debug, Deserialize)]
struct BaiduZoneListResponse {
    zones: Option<Vec<BaiduZone>>,
}

#[derive(Debug, Deserialize)]
struct BaiduZone {
    id: String,
    name: String,
    record_count: Option<u32>,
    update_time: Option<String>,
}

#[derive(Debug, Deserialize)]
struct BaiduRecordListResponse {
    records: Option<Vec<BaiduRecord>>,
}

#[derive(Debug, Deserialize)]
struct BaiduRecord {
    id: String,
    rr: String,
    #[serde(rename = "type")]
    record_type: String,
    value: String,
    ttl: u32,
    priority: Option<u16>,
}

impl BaiduRecord {
    fn to_dns_record(self, domain_name: &str) -> DnsRecord {
        let (content, srv_priority, srv_weight, srv_port, caa_flags, caa_tag) =
            parse_baidu_record_value(&self.record_type, &self.value);
        DnsRecord {
            id: self.id,
            provider: Provider::Baidu,
            domain: domain_name.to_string(),
            record_type: self.record_type,
            name: self.rr,
            content,
            ttl: self.ttl,
            mx_priority: self.priority,
            srv_priority,
            srv_weight,
            srv_port,
            caa_flags,
            caa_tag,
        }
    }
}

#[derive(Debug, serde::Serialize)]
struct BaiduRecordCreateRequest {
    rr: String,
    #[serde(rename = "type")]
    record_type: String,
    value: String,
    ttl: u32,
    priority: Option<u16>,
}

fn baidu_value(
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

fn parse_baidu_record_value(
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
