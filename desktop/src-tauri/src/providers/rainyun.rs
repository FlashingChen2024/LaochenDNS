use crate::error::AppError;
use crate::types::{DnsRecord, DomainItem, DomainStatus, Provider, RecordCreateRequest, RecordUpdateRequest};
use reqwest::header::{HeaderMap, HeaderValue};
use serde::Serialize;
use serde_json::Value;
use std::time::Duration;

const API_BASE: &str = "https://api.v2.rainyun.com";

pub struct RainyunClient {
    client: reqwest::Client,
    api_key: String,
}

impl RainyunClient {
    pub fn new(api_key: String) -> Result<Self, AppError> {
        let client = reqwest::Client::builder()
            .user_agent("LaoChenDNS/0.1.0")
            .timeout(Duration::from_secs(30))
            .build()
            .map_err(AppError::from)?;
        Ok(Self { client, api_key })
    }

    pub async fn test(&self) -> Result<(), AppError> {
        let _ = self.list_domains().await?;
        Ok(())
    }

    pub async fn list_domains(&self) -> Result<Vec<DomainItem>, AppError> {
        let url = format!("{API_BASE}/product/domain/");
        let res = self
            .client
            .get(url)
            .headers(self.headers()?)
            .query(&[("options", "{}")])
            .send()
            .await
            .map_err(AppError::from)?;
        let value = parse_json_or_error(res, "fetch_failed").await?;
        let mut items = Vec::new();
        for item in extract_array(&value) {
            if let Some(domain) = parse_domain_item(&item) {
                items.push(domain);
            }
        }
        Ok(items)
    }

    pub async fn list_records(&self, domain_id: &str, domain_name: &str) -> Result<Vec<DnsRecord>, AppError> {
        let url = format!("{API_BASE}/product/domain/{domain_id}/dns/");
        let res = self
            .client
            .get(url)
            .headers(self.headers()?)
            .query(&[("limit", "500"), ("page_no", "1")])
            .send()
            .await
            .map_err(AppError::from)?;
        let value = parse_json_or_error(res, "fetch_failed").await?;
        let mut items = Vec::new();
        for item in extract_array(&value) {
            if let Some(record) = parse_record_item(&item, domain_name) {
                items.push(record);
            }
        }
        Ok(items)
    }

    pub async fn create_record(&self, domain_id: &str, domain_name: &str, req: &RecordCreateRequest) -> Result<DnsRecord, AppError> {
        let url = format!("{API_BASE}/product/domain/{domain_id}/dns");
        let payload = RainyunRecordPayload {
            host: req.name.clone(),
            level: 0,
            line: "DEFAULT".to_string(),
            rain_product_id: parse_u64(domain_id).unwrap_or(0),
            rain_product_type: "rcs".to_string(),
            record_id: 0,
            ttl: req.ttl,
            record_type: req.record_type.clone(),
            value: req.content.clone(),
        };
        let res = self
            .client
            .post(url)
            .headers(self.headers()?)
            .json(&payload)
            .send()
            .await
            .map_err(AppError::from)?;
        let value = parse_json_or_error(res, "create_failed").await?;
        parse_record_from_response(
            &value,
            domain_name,
            None,
            &req.record_type,
            &req.name,
            &req.content,
            req.ttl,
            req.mx_priority,
            req.srv_priority,
            req.srv_weight,
            req.srv_port,
            req.caa_flags,
            req.caa_tag.as_ref(),
        )
    }

    pub async fn update_record(&self, domain_id: &str, domain_name: &str, req: &RecordUpdateRequest) -> Result<DnsRecord, AppError> {
        let record_id = parse_u64(&req.id).ok_or_else(|| AppError::new("invalid_input", "记录 ID 无效"))?;
        let url = format!("{API_BASE}/product/domain/{domain_id}/dns");
        let payload = RainyunRecordPayload {
            host: req.name.clone(),
            level: 0,
            line: "DEFAULT".to_string(),
            rain_product_id: parse_u64(domain_id).unwrap_or(0),
            rain_product_type: "rcs".to_string(),
            record_id,
            ttl: req.ttl,
            record_type: req.record_type.clone(),
            value: req.content.clone(),
        };
        let res = self
            .client
            .patch(url)
            .headers(self.headers()?)
            .json(&payload)
            .send()
            .await
            .map_err(AppError::from)?;
        let value = parse_json_or_error(res, "update_failed").await?;
        parse_record_from_response(
            &value,
            domain_name,
            Some(record_id),
            &req.record_type,
            &req.name,
            &req.content,
            req.ttl,
            req.mx_priority,
            req.srv_priority,
            req.srv_weight,
            req.srv_port,
            req.caa_flags,
            req.caa_tag.as_ref(),
        )
    }

    pub async fn delete_record(&self, domain_id: &str, record_id: &str) -> Result<(), AppError> {
        let record_id = parse_u64(record_id).ok_or_else(|| AppError::new("invalid_input", "记录 ID 无效"))?;
        let url = format!("{API_BASE}/product/domain/{domain_id}/dns/");
        let res = self
            .client
            .delete(url)
            .headers(self.headers()?)
            .json(&serde_json::json!({ "record_id": record_id }))
            .send()
            .await
            .map_err(AppError::from)?;
        if !res.status().is_success() {
            let status = res.status();
            let text = res.text().await.unwrap_or_default();
            let code = if status.as_u16() == 401 || status.as_u16() == 403 {
                "auth_failed"
            } else {
                "delete_failed"
            };
            return Err(AppError::new(code, format!("HTTP {}: {}", status.as_u16(), text)));
        }
        Ok(())
    }

    fn headers(&self) -> Result<HeaderMap, AppError> {
        let mut headers = HeaderMap::new();
        headers.insert(
            "x-api-key",
            HeaderValue::from_str(&self.api_key).map_err(|e| AppError::new("invalid_input", e.to_string()))?,
        );
        Ok(headers)
    }
}

#[derive(Debug, Serialize)]
struct RainyunRecordPayload {
    host: String,
    level: u32,
    line: String,
    rain_product_id: u64,
    rain_product_type: String,
    record_id: u64,
    ttl: u32,
    #[serde(rename = "type")]
    record_type: String,
    value: String,
}

async fn parse_json_or_error(res: reqwest::Response, code: &str) -> Result<Value, AppError> {
    if !res.status().is_success() {
        let status = res.status();
        let text = res.text().await.unwrap_or_default();
        let mapped = if status.as_u16() == 401 || status.as_u16() == 403 {
            "auth_failed"
        } else {
            code
        };
        return Err(AppError::new(mapped, format!("HTTP {}: {}", status.as_u16(), text)));
    }
    res.json::<Value>().await.map_err(AppError::from)
}

fn extract_array(value: &Value) -> Vec<Value> {
    if let Some(arr) = value.as_array() {
        return arr.clone();
    }
    if let Some(arr) = value.get("data").and_then(|v| v.as_array()) {
        return arr.clone();
    }
    if let Some(arr) = value.get("data").and_then(|v| v.get("data")).and_then(|v| v.as_array()) {
        return arr.clone();
    }
    if let Some(arr) = value.get("data").and_then(|v| v.get("list")).and_then(|v| v.as_array()) {
        return arr.clone();
    }
    if let Some(arr) = value.get("list").and_then(|v| v.as_array()) {
        return arr.clone();
    }
    if let Some(arr) = value.get("records").and_then(|v| v.as_array()) {
        return arr.clone();
    }
    if let Some(arr) = value.get("items").and_then(|v| v.as_array()) {
        return arr.clone();
    }
    Vec::new()
}

fn parse_domain_item(value: &Value) -> Option<DomainItem> {
    let name = extract_string(value, &["domain", "name", "domain_name"])?;
    let id = extract_string(value, &["id", "domain_id", "domainId"])?;
    let records_count = extract_u32(value, &["record_count", "records_count", "recordCount"]);
    let last_changed_at = extract_string(value, &["updated_at", "update_time", "updatedAt"]);
    Some(DomainItem {
        provider: Provider::Rainyun,
        name,
        provider_id: id,
        status: DomainStatus::Ok,
        records_count,
        last_changed_at,
    })
}

fn parse_record_item(value: &Value, domain_name: &str) -> Option<DnsRecord> {
    let id = extract_string(value, &["record_id", "id"])?;
    let record_type = extract_string(value, &["type", "record_type", "recordType"])?;
    let host = extract_string(value, &["host", "name", "rr"])?;
    let content = extract_string(value, &["value", "content"])?;
    let ttl = extract_u32(value, &["ttl"]).unwrap_or(600);
    Some(DnsRecord {
        id,
        provider: Provider::Rainyun,
        domain: domain_name.to_string(),
        record_type,
        name: host,
        content,
        ttl,
        mx_priority: extract_u16(value, &["mx", "priority", "mx_priority"]),
        srv_priority: extract_u16(value, &["srv_priority", "priority"]),
        srv_weight: extract_u16(value, &["srv_weight", "weight"]),
        srv_port: extract_u16(value, &["srv_port", "port"]),
        caa_flags: None,
        caa_tag: extract_string(value, &["caa_tag", "tag"]),
    })
}

fn parse_record_from_response(
    value: &Value,
    domain_name: &str,
    record_id: Option<u64>,
    record_type: &str,
    name: &str,
    content: &str,
    ttl: u32,
    mx_priority: Option<u16>,
    srv_priority: Option<u16>,
    srv_weight: Option<u16>,
    srv_port: Option<u16>,
    caa_flags: Option<u8>,
    caa_tag: Option<&String>,
) -> Result<DnsRecord, AppError> {
    let record_value = value
        .get("data")
        .and_then(|v| v.get("record"))
        .or_else(|| value.get("data"))
        .unwrap_or(value);
    if let Some(record) = parse_record_item(record_value, domain_name) {
        return Ok(record);
    }
    let id = record_id.map(|v| v.to_string()).unwrap_or_else(|| "0".to_string());
    Ok(DnsRecord {
        id,
        provider: Provider::Rainyun,
        domain: domain_name.to_string(),
        record_type: record_type.to_string(),
        name: name.to_string(),
        content: content.to_string(),
        ttl,
        mx_priority,
        srv_priority,
        srv_weight,
        srv_port,
        caa_flags,
        caa_tag: caa_tag.cloned(),
    })
}

fn extract_string(value: &Value, keys: &[&str]) -> Option<String> {
    for key in keys {
        if let Some(v) = value.get(*key) {
            if let Some(s) = v.as_str() {
                return Some(s.to_string());
            }
            if let Some(n) = v.as_i64() {
                return Some(n.to_string());
            }
            if let Some(n) = v.as_u64() {
                return Some(n.to_string());
            }
        }
    }
    None
}

fn extract_u32(value: &Value, keys: &[&str]) -> Option<u32> {
    for key in keys {
        if let Some(v) = value.get(*key) {
            if let Some(n) = v.as_u64() {
                return u32::try_from(n).ok();
            }
            if let Some(s) = v.as_str() {
                if let Ok(n) = s.parse::<u32>() {
                    return Some(n);
                }
            }
        }
    }
    None
}

fn extract_u16(value: &Value, keys: &[&str]) -> Option<u16> {
    for key in keys {
        if let Some(v) = value.get(*key) {
            if let Some(n) = v.as_u64() {
                return u16::try_from(n).ok();
            }
            if let Some(s) = v.as_str() {
                if let Ok(n) = s.parse::<u16>() {
                    return Some(n);
                }
            }
        }
    }
    None
}

fn parse_u64(value: &str) -> Option<u64> {
    value.trim().parse::<u64>().ok()
}
