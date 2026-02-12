use crate::error::AppError;
use crate::types::{DnsRecord, DomainItem, DomainStatus, Provider, RecordCreateRequest, RecordUpdateRequest};
use chrono::{DateTime, NaiveDateTime, Utc};
use hmac::{Hmac, Mac};
use reqwest::header::{HeaderMap, HeaderValue};
use serde_json::{Map, Value};
use sha2::{Digest, Sha256};
use std::time::Duration;

const API_HOST: &str = "dnspod.tencentcloudapi.com";
const API_ENDPOINT: &str = "https://dnspod.tencentcloudapi.com";
const API_VERSION: &str = "2021-03-23";
const SERVICE: &str = "dnspod";

type HmacSha256 = Hmac<Sha256>;

pub struct TencentCloudClient {
    client: reqwest::Client,
    secret_id: String,
    secret_key: String,
}

impl TencentCloudClient {
    pub fn new(secret_id: String, secret_key: String) -> Result<Self, AppError> {
        let client = reqwest::Client::builder()
            .user_agent("LaoChenDNS/0.1.0")
            .timeout(Duration::from_secs(30))
            .build()
            .map_err(AppError::from)?;
        Ok(Self {
            client,
            secret_id,
            secret_key,
        })
    }

    pub async fn test(&self) -> Result<(), AppError> {
        let _ = self.list_domains().await?;
        Ok(())
    }

    pub async fn list_domains(&self) -> Result<Vec<DomainItem>, AppError> {
        let value = self
            .request("DescribeDomainList", serde_json::json!({"Offset": 0, "Limit": 200}))
            .await?;
        let list = value
            .get("Response")
            .and_then(|v| v.get("DomainList"))
            .and_then(|v| v.as_array())
            .cloned()
            .unwrap_or_default();
        let mut items = Vec::new();
        for item in list {
            let name = extract_string(&item, "Name").unwrap_or_default();
            let id = extract_string(&item, "DomainId").unwrap_or_default();
            let records_count = extract_u32(&item, "RecordCount");
            let last_changed_at = item
                .get("UpdatedOn")
                .and_then(|v| v.as_str())
                .and_then(normalize_datetime);
            items.push(DomainItem {
                provider: Provider::Tencentcloud,
                name,
                provider_id: id,
                status: DomainStatus::Ok,
                records_count,
                last_changed_at,
            });
        }
        Ok(items)
    }

    pub async fn list_records(&self, domain_id: &str, domain_name: &str) -> Result<Vec<DnsRecord>, AppError> {
        let mut payload = domain_selector(domain_id, domain_name)?;
        payload.insert("Offset".to_string(), serde_json::json!(0));
        payload.insert("Limit".to_string(), serde_json::json!(500));
        let value = self
            .request("DescribeRecordList", Value::Object(payload))
            .await?;
        let list = value
            .get("Response")
            .and_then(|v| v.get("RecordList"))
            .and_then(|v| v.as_array())
            .cloned()
            .unwrap_or_default();
        let mut records = Vec::new();
        for item in list {
            if let Some(record) = parse_record_item(&item, domain_name) {
                records.push(record);
            }
        }
        Ok(records)
    }

    pub async fn create_record(
        &self,
        domain_id: &str,
        domain_name: &str,
        req: &RecordCreateRequest,
    ) -> Result<DnsRecord, AppError> {
        let mut payload = domain_selector(domain_id, domain_name)?;
        let sub_domain = if req.name.trim().is_empty() { "@" } else { req.name.as_str() };
        payload.insert("SubDomain".to_string(), serde_json::json!(sub_domain));
        payload.insert("RecordType".to_string(), serde_json::json!(req.record_type));
        payload.insert("RecordLine".to_string(), serde_json::json!("默认"));
        payload.insert(
            "Value".to_string(),
            serde_json::json!(tencent_value(
                &req.record_type,
                &req.content,
                req.srv_priority,
                req.srv_weight,
                req.srv_port,
                req.caa_flags,
                req.caa_tag.as_deref(),
            )),
        );
        payload.insert("TTL".to_string(), serde_json::json!(req.ttl));
        if req.record_type == "MX" {
            let mx = req
                .mx_priority
                .ok_or_else(|| AppError::new("invalid_input", "MX record requires mx priority"))?;
            payload.insert("MX".to_string(), serde_json::json!(mx));
        }
        let value = self
            .request("CreateRecord", Value::Object(payload))
            .await?;
        parse_record_from_response(
            &value,
            domain_name,
            &req.record_type,
            &req.name,
            &req.content,
            req.ttl,
            req.mx_priority,
            None,
        )
    }

    pub async fn update_record(
        &self,
        domain_id: &str,
        domain_name: &str,
        req: &RecordUpdateRequest,
    ) -> Result<DnsRecord, AppError> {
        let mut payload = domain_selector(domain_id, domain_name)?;
        let record_id = parse_u64(&req.id).unwrap_or(0);
        payload.insert("RecordId".to_string(), serde_json::json!(record_id));
        let sub_domain = if req.name.trim().is_empty() { "@" } else { req.name.as_str() };
        payload.insert("SubDomain".to_string(), serde_json::json!(sub_domain));
        payload.insert("RecordType".to_string(), serde_json::json!(req.record_type));
        payload.insert("RecordLine".to_string(), serde_json::json!("默认"));
        payload.insert(
            "Value".to_string(),
            serde_json::json!(tencent_value(
                &req.record_type,
                &req.content,
                req.srv_priority,
                req.srv_weight,
                req.srv_port,
                req.caa_flags,
                req.caa_tag.as_deref(),
            )),
        );
        payload.insert("TTL".to_string(), serde_json::json!(req.ttl));
        if req.record_type == "MX" {
            let mx = req
                .mx_priority
                .ok_or_else(|| AppError::new("invalid_input", "MX record requires mx priority"))?;
            payload.insert("MX".to_string(), serde_json::json!(mx));
        }
        let value = self
            .request("ModifyRecord", Value::Object(payload))
            .await?;
        parse_record_from_response(
            &value,
            domain_name,
            &req.record_type,
            &req.name,
            &req.content,
            req.ttl,
            req.mx_priority,
            Some(record_id),
        )
    }

    pub async fn delete_record(&self, domain_id: &str, domain_name: &str, record_id: &str) -> Result<(), AppError> {
        let mut payload = domain_selector(domain_id, domain_name)?;
        let record_id = parse_u64(record_id).unwrap_or(0);
        payload.insert("RecordId".to_string(), serde_json::json!(record_id));
        let _ = self.request("DeleteRecord", Value::Object(payload)).await?;
        Ok(())
    }

    async fn request(&self, action: &str, payload: Value) -> Result<Value, AppError> {
        let now = Utc::now();
        let timestamp = now.timestamp();
        let date = now.format("%Y-%m-%d").to_string();
        let payload_str =
            serde_json::to_string(&payload).map_err(|e| AppError::new("serialize_error", e.to_string()))?;
        let canonical_request = format!(
            "POST\n/\n\ncontent-type:application/json; charset=utf-8\nhost:{API_HOST}\n\ncontent-type;host\n{}",
            hex::encode(Sha256::digest(payload_str.as_bytes()))
        );
        let credential_scope = format!("{date}/{SERVICE}/tc3_request");
        let string_to_sign = format!(
            "TC3-HMAC-SHA256\n{timestamp}\n{credential_scope}\n{}",
            hex::encode(Sha256::digest(canonical_request.as_bytes()))
        );
        let secret_date = hmac_sha256(format!("TC3{}", self.secret_key).as_bytes(), &date);
        let secret_service = hmac_sha256(&secret_date, SERVICE);
        let secret_signing = hmac_sha256(&secret_service, "tc3_request");
        let signature = hex::encode(hmac_sha256(&secret_signing, &string_to_sign));
        let authorization = format!(
            "TC3-HMAC-SHA256 Credential={}/{}, SignedHeaders=content-type;host, Signature={}",
            self.secret_id, credential_scope, signature
        );

        let mut headers = HeaderMap::new();
        headers.insert(
            "Content-Type",
            HeaderValue::from_static("application/json; charset=utf-8"),
        );
        headers.insert("Host", HeaderValue::from_static(API_HOST));
        headers.insert("X-TC-Action", HeaderValue::from_str(action).map_err(|e| AppError::new("invalid_input", e.to_string()))?);
        headers.insert(
            "X-TC-Version",
            HeaderValue::from_static(API_VERSION),
        );
        headers.insert(
            "X-TC-Timestamp",
            HeaderValue::from_str(&timestamp.to_string()).map_err(|e| AppError::new("invalid_input", e.to_string()))?,
        );
        headers.insert(
            "Authorization",
            HeaderValue::from_str(&authorization).map_err(|e| AppError::new("invalid_input", e.to_string()))?,
        );

        let res = self
            .client
            .post(API_ENDPOINT)
            .headers(headers)
            .body(payload_str)
            .send()
            .await
            .map_err(AppError::from)?;
        let status = res.status();
        let text = res.text().await.unwrap_or_default();
        if !status.is_success() {
            return Err(AppError::new("fetch_failed", format!("HTTP {}: {}", status.as_u16(), text)));
        }
        let value: Value =
            serde_json::from_str(&text).map_err(|e| AppError::new("json_decode_failed", e.to_string()))?;
        if let Some(error) = value.get("Response").and_then(|v| v.get("Error")) {
            let code = error
                .get("Code")
                .and_then(|v| v.as_str())
                .unwrap_or("FailedOperation");
            let message = error
                .get("Message")
                .and_then(|v| v.as_str())
                .unwrap_or("TencentCloud request failed");
            let err_code = if code.contains("AuthFailure") || code.contains("UnauthorizedOperation") {
                "auth_failed"
            } else {
                "fetch_failed"
            };
            return Err(AppError::new(err_code, message));
        }
        Ok(value)
    }
}

fn hmac_sha256(key: &[u8], msg: &str) -> Vec<u8> {
    let mut mac = HmacSha256::new_from_slice(key).expect("hmac can take key of any size");
    mac.update(msg.as_bytes());
    mac.finalize().into_bytes().to_vec()
}

fn extract_string(value: &Value, key: &str) -> Option<String> {
    value.get(key).and_then(|v| {
        if let Some(s) = v.as_str() {
            Some(s.to_string())
        } else if let Some(n) = v.as_u64() {
            Some(n.to_string())
        } else {
            None
        }
    })
}

fn extract_u32(value: &Value, key: &str) -> Option<u32> {
    value.get(key).and_then(|v| {
        if let Some(n) = v.as_u64() {
            u32::try_from(n).ok()
        } else if let Some(s) = v.as_str() {
            s.parse::<u32>().ok()
        } else {
            None
        }
    })
}

fn extract_u16(value: &Value, key: &str) -> Option<u16> {
    value.get(key).and_then(|v| {
        if let Some(n) = v.as_u64() {
            u16::try_from(n).ok()
        } else if let Some(s) = v.as_str() {
            s.parse::<u16>().ok()
        } else {
            None
        }
    })
}

fn normalize_datetime(value: &str) -> Option<String> {
    if let Ok(dt) = DateTime::parse_from_rfc3339(value) {
        return Some(dt.to_rfc3339());
    }
    if let Ok(dt) = NaiveDateTime::parse_from_str(value, "%Y-%m-%d %H:%M:%S") {
        return Some(DateTime::<Utc>::from_naive_utc_and_offset(dt, Utc).to_rfc3339());
    }
    None
}

fn parse_record_item(value: &Value, domain_name: &str) -> Option<DnsRecord> {
    let id = extract_string(value, "RecordId")?;
    let record_type = extract_string(value, "Type").unwrap_or_else(|| "A".to_string());
    let name = extract_string(value, "Name").unwrap_or_else(|| "@".to_string());
    let raw_value = extract_string(value, "Value").unwrap_or_default();
    let ttl = extract_u32(value, "TTL").unwrap_or(600);
    let mx_priority = extract_u16(value, "MX");
    let (content, srv_priority, srv_weight, srv_port, caa_flags, caa_tag) =
        parse_record_value(&record_type, &raw_value);
    Some(DnsRecord {
        id,
        provider: Provider::Tencentcloud,
        domain: domain_name.to_string(),
        record_type,
        name,
        content,
        ttl,
        mx_priority,
        srv_priority,
        srv_weight,
        srv_port,
        caa_flags,
        caa_tag,
    })
}

fn parse_record_from_response(
    value: &Value,
    domain_name: &str,
    record_type: &str,
    name: &str,
    content_raw: &str,
    ttl: u32,
    mx_priority: Option<u16>,
    record_id: Option<u64>,
) -> Result<DnsRecord, AppError> {
    let record_id = value
        .get("Response")
        .and_then(|v| v.get("RecordId"))
        .and_then(|v| v.as_u64())
        .or(record_id)
        .unwrap_or(0)
        .to_string();
    let (content, srv_priority, srv_weight, srv_port, caa_flags, caa_tag) =
        parse_record_value(record_type, content_raw);
    Ok(DnsRecord {
        id: record_id,
        provider: Provider::Tencentcloud,
        domain: domain_name.to_string(),
        record_type: record_type.to_string(),
        name: name.to_string(),
        content,
        ttl,
        mx_priority,
        srv_priority,
        srv_weight,
        srv_port,
        caa_flags,
        caa_tag,
    })
}

fn parse_record_value(
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

fn tencent_value(
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

fn parse_u64(value: &str) -> Option<u64> {
    value.trim().parse::<u64>().ok()
}

fn domain_selector(domain_id: &str, domain_name: &str) -> Result<Map<String, Value>, AppError> {
    let mut payload = Map::new();
    let mut name = domain_name.trim();
    if name.is_empty() {
        let fallback = domain_id.trim();
        if !fallback.is_empty() && fallback.contains('.') {
            name = fallback;
        }
    }
    if name.is_empty() {
        return Err(AppError::new("invalid_input", "domain is required"));
    }
    // Domain 参数是必选的
    payload.insert("Domain".to_string(), serde_json::json!(name));
    // DomainId 是可选的，但如果提供可以优先使用
    let id = parse_u64(domain_id).unwrap_or(0);
    if id > 0 {
        payload.insert("DomainId".to_string(), serde_json::json!(id));
    }
    Ok(payload)
}
