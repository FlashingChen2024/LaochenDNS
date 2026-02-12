use crate::error::AppError;
use crate::types::{DnsRecord, DomainItem, DomainStatus, Provider, RecordCreateRequest, RecordUpdateRequest};
use base64::Engine;
use chrono::{DateTime, Utc};
use hmac::{Hmac, Mac};
use serde::Deserialize;
use sha1::Sha1;
use std::collections::BTreeMap;
use std::time::Duration;

const API_BASE: &str = "https://alidns.aliyuncs.com";

pub struct AliyunClient {
    client: reqwest::Client,
    access_key_id: String,
    access_key_secret: String,
}

impl AliyunClient {
    pub fn new(access_key_id: String, access_key_secret: String) -> Result<Self, AppError> {
        let client = reqwest::Client::builder()
            .user_agent("LaoChenDNS/0.1.0")
            .timeout(Duration::from_secs(30))
            .build()
            .map_err(AppError::from)?;
        Ok(Self {
            client,
            access_key_id,
            access_key_secret,
        })
    }

    pub async fn test(&self) -> Result<(), AppError> {
        let _ = self.list_domains().await?;
        Ok(())
    }

    pub async fn list_domains(&self) -> Result<Vec<DomainItem>, AppError> {
        let mut params = self.common_params("DescribeDomains");
        params.insert("PageSize".to_string(), "500".to_string());
        let parsed: AliyunDomainListResponse = self.request(params).await?;
        let mut items = Vec::new();
        if let Some(domains) = parsed.domains.and_then(|d| d.domain) {
            for d in domains {
                items.push(DomainItem {
                    provider: Provider::Aliyun,
                    name: d.domain_name.clone(),
                    provider_id: d.domain_id.clone(),
                    status: DomainStatus::Ok,
                    records_count: d.record_count.and_then(|v| v.parse::<u32>().ok()),
                    last_changed_at: d
                        .update_time
                        .as_deref()
                        .and_then(|s| parse_aliyun_time(s).ok())
                        .map(|d| d.to_rfc3339()),
                });
            }
        }
        Ok(items)
    }

    pub async fn list_records(&self, domain_id: &str, domain_name: &str) -> Result<Vec<DnsRecord>, AppError> {
        let mut params = self.common_params("DescribeDomainRecords");
        params.insert("DomainName".to_string(), domain_name.to_string());
        params.insert("PageSize".to_string(), "500".to_string());
        let parsed: AliyunRecordListResponse = self.request(params).await?;
        let mut records = Vec::new();
        if let Some(items) = parsed.domain_records.and_then(|r| r.record) {
            for item in items {
                records.push(item.to_dns_record(domain_name));
            }
        }
        if records.is_empty() {
            let _ = domain_id;
        }
        Ok(records)
    }

    pub async fn create_record(&self, _domain_id: &str, domain_name: &str, req: &RecordCreateRequest) -> Result<DnsRecord, AppError> {
        let mut params = self.common_params("AddDomainRecord");
        params.insert("DomainName".to_string(), domain_name.to_string());
        params.insert("RR".to_string(), req.name.clone());
        params.insert("Type".to_string(), req.record_type.clone());
        params.insert(
            "Value".to_string(),
            aliyun_value(
                &req.record_type,
                &req.content,
                req.srv_priority,
                req.srv_weight,
                req.srv_port,
                req.caa_flags,
                req.caa_tag.as_deref(),
            ),
        );
        params.insert("TTL".to_string(), req.ttl.to_string());
        if req.record_type == "MX" || req.record_type == "SRV" {
            if let Some(priority) = req.mx_priority.or(req.srv_priority) {
                params.insert("Priority".to_string(), priority.to_string());
            }
        }
        if req.record_type == "SRV" {
            if let Some(weight) = req.srv_weight {
                params.insert("Weight".to_string(), weight.to_string());
            }
            if let Some(port) = req.srv_port {
                params.insert("Port".to_string(), port.to_string());
            }
        }
        let parsed: AliyunRecordCreateResponse = self.request(params).await?;
        let record_id = parsed.record_id.unwrap_or_default();
        Ok(DnsRecord {
            id: record_id,
            provider: Provider::Aliyun,
            domain: domain_name.to_string(),
            record_type: req.record_type.clone(),
            name: req.name.clone(),
            content: req.content.clone(),
            ttl: req.ttl,
            mx_priority: req.mx_priority,
            srv_priority: req.srv_priority,
            srv_weight: req.srv_weight,
            srv_port: req.srv_port,
            caa_flags: req.caa_flags,
            caa_tag: req.caa_tag.clone(),
        })
    }

    pub async fn update_record(&self, _domain_id: &str, domain_name: &str, req: &RecordUpdateRequest) -> Result<DnsRecord, AppError> {
        let mut params = self.common_params("UpdateDomainRecord");
        params.insert("RecordId".to_string(), req.id.clone());
        params.insert("RR".to_string(), req.name.clone());
        params.insert("Type".to_string(), req.record_type.clone());
        params.insert(
            "Value".to_string(),
            aliyun_value(
                &req.record_type,
                &req.content,
                req.srv_priority,
                req.srv_weight,
                req.srv_port,
                req.caa_flags,
                req.caa_tag.as_deref(),
            ),
        );
        params.insert("TTL".to_string(), req.ttl.to_string());
        if req.record_type == "MX" || req.record_type == "SRV" {
            if let Some(priority) = req.mx_priority.or(req.srv_priority) {
                params.insert("Priority".to_string(), priority.to_string());
            }
        }
        if req.record_type == "SRV" {
            if let Some(weight) = req.srv_weight {
                params.insert("Weight".to_string(), weight.to_string());
            }
            if let Some(port) = req.srv_port {
                params.insert("Port".to_string(), port.to_string());
            }
        }
        let _: AliyunRecordCreateResponse = self.request(params).await?;
        Ok(DnsRecord {
            id: req.id.clone(),
            provider: Provider::Aliyun,
            domain: domain_name.to_string(),
            record_type: req.record_type.clone(),
            name: req.name.clone(),
            content: req.content.clone(),
            ttl: req.ttl,
            mx_priority: req.mx_priority,
            srv_priority: req.srv_priority,
            srv_weight: req.srv_weight,
            srv_port: req.srv_port,
            caa_flags: req.caa_flags,
            caa_tag: req.caa_tag.clone(),
        })
    }

    pub async fn delete_record(&self, _domain_id: &str, record_id: &str) -> Result<(), AppError> {
        let mut params = self.common_params("DeleteDomainRecord");
        params.insert("RecordId".to_string(), record_id.to_string());
        let _: AliyunRecordCreateResponse = self.request(params).await?;
        Ok(())
    }

    fn common_params(&self, action: &str) -> BTreeMap<String, String> {
        let mut params = BTreeMap::new();
        params.insert("Action".to_string(), action.to_string());
        params.insert("Format".to_string(), "JSON".to_string());
        params.insert("Version".to_string(), "2015-01-09".to_string());
        params.insert("AccessKeyId".to_string(), self.access_key_id.clone());
        params.insert("SignatureMethod".to_string(), "HMAC-SHA1".to_string());
        params.insert("SignatureVersion".to_string(), "1.0".to_string());
        params.insert("SignatureNonce".to_string(), format!("{:x}", rand::random::<u128>()));
        params.insert("Timestamp".to_string(), Utc::now().format("%Y-%m-%dT%H:%M:%SZ").to_string());
        params
    }

    async fn request<T: serde::de::DeserializeOwned>(&self, mut params: BTreeMap<String, String>) -> Result<T, AppError> {
        let signature = self.sign(&params)?;
        params.insert("Signature".to_string(), signature);
        let res = self
            .client
            .get(API_BASE)
            .query(&params)
            .send()
            .await
            .map_err(AppError::from)?;
        let status = res.status();
        let text = res.text().await.map_err(AppError::from)?;
        if !status.is_success() {
            return Err(AppError::new(
                "fetch_failed",
                format!(
                    "HTTP {}: {} (response text: {})",
                    status.as_u16(),
                    status.canonical_reason().unwrap_or("Unknown"),
                    text
                ),
            ));
        }
        if let Ok(err) = serde_json::from_str::<AliyunErrorResponse>(&text) {
            if let Some(code) = err.code {
                let message = err.message.unwrap_or_else(|| code.clone());
                let error_code = if code.contains("AccessKey") || code.contains("Signature") {
                    "auth_failed"
                } else {
                    "fetch_failed"
                };
                return Err(AppError::new(error_code, message));
            }
        }
        serde_json::from_str::<T>(&text).map_err(|e| {
            AppError::new(
                "json_decode_failed",
                format!("Failed to decode response: {} (response text: {})", e, text),
            )
        })
    }

    fn sign(&self, params: &BTreeMap<String, String>) -> Result<String, AppError> {
        let mut canonicalized: Vec<String> = Vec::new();
        for (k, v) in params {
            canonicalized.push(format!("{}={}", percent_encode(k), percent_encode(v)));
        }
        let canonicalized_query = canonicalized.join("&");
        let string_to_sign = format!("GET&%2F&{}", percent_encode(&canonicalized_query));
        let key = format!("{}&", self.access_key_secret);
        let mut mac = Hmac::<Sha1>::new_from_slice(key.as_bytes()).map_err(|e| AppError::new("invalid_key", e.to_string()))?;
        mac.update(string_to_sign.as_bytes());
        let signature = base64::engine::general_purpose::STANDARD.encode(mac.finalize().into_bytes());
        Ok(signature)
    }
}

fn percent_encode(value: &str) -> String {
    urlencoding::encode(value)
        .into_owned()
        .replace('+', "%20")
        .replace('*', "%2A")
        .replace("%7E", "~")
}

fn parse_aliyun_time(value: &str) -> Result<DateTime<Utc>, anyhow::Error> {
    let dt = chrono::DateTime::parse_from_rfc3339(value)?;
    Ok(dt.with_timezone(&Utc))
}

fn aliyun_value(
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
struct AliyunErrorResponse {
    #[serde(rename = "Code")]
    code: Option<String>,
    #[serde(rename = "Message")]
    message: Option<String>,
}

#[derive(Debug, Deserialize)]
struct AliyunDomainListResponse {
    #[serde(rename = "Domains")]
    domains: Option<AliyunDomains>,
}

#[derive(Debug, Deserialize)]
struct AliyunDomains {
    #[serde(rename = "Domain")]
    domain: Option<Vec<AliyunDomain>>,
}

#[derive(Debug, Deserialize)]
struct AliyunDomain {
    #[serde(rename = "DomainId")]
    domain_id: String,
    #[serde(rename = "DomainName")]
    domain_name: String,
    #[serde(rename = "RecordCount")]
    record_count: Option<String>,
    #[serde(rename = "UpdateTime")]
    update_time: Option<String>,
}

#[derive(Debug, Deserialize)]
struct AliyunRecordListResponse {
    #[serde(rename = "DomainRecords")]
    domain_records: Option<AliyunDomainRecords>,
}

#[derive(Debug, Deserialize)]
struct AliyunDomainRecords {
    #[serde(rename = "Record")]
    record: Option<Vec<AliyunRecord>>,
}

#[derive(Debug, Deserialize)]
struct AliyunRecord {
    #[serde(rename = "RecordId")]
    record_id: String,
    #[serde(rename = "RR")]
    rr: String,
    #[serde(rename = "Type")]
    record_type: String,
    #[serde(rename = "Value")]
    value: String,
    #[serde(rename = "TTL")]
    ttl: u32,
    #[serde(rename = "Priority")]
    priority: Option<u16>,
}

impl AliyunRecord {
    fn to_dns_record(self, domain_name: &str) -> DnsRecord {
        DnsRecord {
            id: self.record_id,
            provider: Provider::Aliyun,
            domain: domain_name.to_string(),
            record_type: self.record_type,
            name: self.rr,
            content: self.value,
            ttl: self.ttl,
            mx_priority: self.priority,
            srv_priority: None,
            srv_weight: None,
            srv_port: None,
            caa_flags: None,
            caa_tag: None,
        }
    }
}

#[derive(Debug, Deserialize)]
struct AliyunRecordCreateResponse {
    #[serde(rename = "RecordId")]
    record_id: Option<String>,
}
