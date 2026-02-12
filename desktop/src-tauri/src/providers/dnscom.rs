use crate::error::AppError;
use crate::types::{DnsRecord, DomainItem, DomainStatus, Provider, RecordCreateRequest, RecordUpdateRequest};
use anyhow::Context;
use chrono::Utc;
use hmac::{Hmac, Mac};
use serde::Deserialize;
use sha2::Sha256;
use std::collections::BTreeMap;
use std::time::Duration;

const API_BASE: &str = "https://openapi.dns.com/api";

pub struct DnscomClient {
    client: reqwest::Client,
    api_key: String,
    api_secret: String,
}

impl DnscomClient {
    pub fn new(api_key: String, api_secret: String) -> Result<Self, AppError> {
        let client = reqwest::Client::builder()
            .user_agent("LaoChenDNS/0.1.0")
            .timeout(Duration::from_secs(30))
            .build()
            .map_err(AppError::from)?;
        Ok(Self {
            client,
            api_key,
            api_secret,
        })
    }

    pub async fn test(&self) -> Result<(), AppError> {
        let _ = self.list_domains().await?;
        Ok(())
    }

    pub async fn list_domains(&self) -> Result<Vec<DomainItem>, AppError> {
        let path = "/domain/lists/";
        let mut params = BTreeMap::new();
        params.insert("page".to_string(), "1".to_string());
        params.insert("paginate".to_string(), "500".to_string());
        self.sign_params("GET", path, &mut params);
        let url = format!("{API_BASE}{path}");
        let res = self
            .client
            .get(url)
            .query(&params)
            .send()
            .await
            .map_err(AppError::from)?;
        let parsed: DnscomResponse<DnscomDomainListData> = res.json().await.map_err(AppError::from)?;
        parsed.ensure_ok()?;
        let mut items = Vec::new();
        if let Some(data) = parsed.data {
            for item in data.data.unwrap_or_default() {
                items.push(DomainItem {
                    provider: Provider::Dnscom,
                    name: item.domain.clone(),
                    provider_id: item.id.to_string(),
                    status: DomainStatus::Ok,
                    records_count: item.record_count,
                    last_changed_at: item.updated_at.clone(),
                });
            }
        }
        Ok(items)
    }

    pub async fn list_records(&self, domain_id: &str, domain_name: &str) -> Result<Vec<DnsRecord>, AppError> {
        let path = "/record/lists/";
        let mut params = BTreeMap::new();
        params.insert("domain".to_string(), domain_name.to_string());
        params.insert("page".to_string(), "1".to_string());
        params.insert("paginate".to_string(), "500".to_string());
        self.sign_params("GET", path, &mut params);
        let url = format!("{API_BASE}{path}");
        let res = self
            .client
            .get(url)
            .query(&params)
            .send()
            .await
            .map_err(AppError::from)?;
        let parsed: DnscomResponse<DnscomRecordListData> = res.json().await.map_err(AppError::from)?;
        parsed.ensure_ok()?;
        let mut items = Vec::new();
        if let Some(data) = parsed.data {
            for record in data.data.unwrap_or_default() {
                items.push(record.to_dns_record(domain_name));
            }
        }
        if items.is_empty() {
            let _ = domain_id;
        }
        Ok(items)
    }

    pub async fn create_record(&self, _domain_id: &str, domain_name: &str, req: &RecordCreateRequest) -> Result<DnsRecord, AppError> {
        let path = "/record/create/";
        let mut params = BTreeMap::new();
        params.insert("domain".to_string(), domain_name.to_string());
        params.insert("record".to_string(), req.name.clone());
        params.insert("type".to_string(), req.record_type.clone());
        params.insert("value".to_string(), req.content.clone());
        params.insert("ttl".to_string(), req.ttl.to_string());
        if req.record_type == "MX" {
            if let Some(mx) = req.mx_priority {
                params.insert("mx".to_string(), mx.to_string());
            }
        }
        params.insert("view_id".to_string(), "1".to_string());
        self.sign_params("POST", path, &mut params);
        let url = format!("{API_BASE}{path}");
        let res = self
            .client
            .post(url)
            .form(&params)
            .send()
            .await
            .map_err(AppError::from)?;
        let parsed: DnscomResponse<DnscomRecord> = res.json().await.map_err(AppError::from)?;
        parsed.ensure_ok()?;
        let record = parsed.data.context("record missing").map_err(AppError::from)?;
        Ok(record.to_dns_record(domain_name))
    }

    pub async fn update_record(&self, _domain_id: &str, domain_name: &str, req: &RecordUpdateRequest) -> Result<DnsRecord, AppError> {
        let path = "/record/update/";
        let mut params = BTreeMap::new();
        params.insert("domain".to_string(), domain_name.to_string());
        params.insert("record_id".to_string(), req.id.clone());
        params.insert("record".to_string(), req.name.clone());
        params.insert("type".to_string(), req.record_type.clone());
        params.insert("value".to_string(), req.content.clone());
        params.insert("ttl".to_string(), req.ttl.to_string());
        if req.record_type == "MX" {
            if let Some(mx) = req.mx_priority {
                params.insert("mx".to_string(), mx.to_string());
            }
        }
        params.insert("view_id".to_string(), "1".to_string());
        self.sign_params("POST", path, &mut params);
        let url = format!("{API_BASE}{path}");
        let res = self
            .client
            .post(url)
            .form(&params)
            .send()
            .await
            .map_err(AppError::from)?;
        let parsed: DnscomResponse<DnscomRecord> = res.json().await.map_err(AppError::from)?;
        parsed.ensure_ok()?;
        let record = parsed.data.context("record missing").map_err(AppError::from)?;
        Ok(record.to_dns_record(domain_name))
    }

    pub async fn delete_record(&self, _domain_id: &str, domain_name: &str, record_id: &str) -> Result<(), AppError> {
        let path = "/record/delete/";
        let mut params = BTreeMap::new();
        params.insert("domain".to_string(), domain_name.to_string());
        params.insert("record_id".to_string(), record_id.to_string());
        self.sign_params("POST", path, &mut params);
        let url = format!("{API_BASE}{path}");
        let res = self
            .client
            .post(url)
            .form(&params)
            .send()
            .await
            .map_err(AppError::from)?;
        let parsed: DnscomResponse<serde_json::Value> = res.json().await.map_err(AppError::from)?;
        parsed.ensure_ok()?;
        Ok(())
    }

    fn sign_params(&self, method: &str, path: &str, params: &mut BTreeMap<String, String>) {
        params.insert("api_key".to_string(), self.api_key.clone());
        let timestamp = Utc::now().timestamp().to_string();
        params.insert("timestamp".to_string(), timestamp.clone());
        let canonical = params
            .iter()
            .map(|(k, v)| format!("{}={}", k, v))
            .collect::<Vec<String>>()
            .join("&");
        let string_to_sign = format!("{}\n{}\n{}", method.to_uppercase(), path, canonical);
        let signature = hmac_sha256_hex(self.api_secret.as_bytes(), string_to_sign.as_bytes());
        params.insert("signature".to_string(), signature);
    }
}

fn hmac_sha256_hex(key: &[u8], data: &[u8]) -> String {
    let mut mac = Hmac::<Sha256>::new_from_slice(key).expect("hmac can take key of any size");
    mac.update(data);
    hex::encode(mac.finalize().into_bytes())
}

#[derive(Debug, Deserialize)]
struct DnscomResponse<T> {
    code: i32,
    message: Option<String>,
    data: Option<T>,
}

impl<T> DnscomResponse<T> {
    fn ensure_ok(&self) -> Result<(), AppError> {
        if self.code == 0 {
            Ok(())
        } else {
            Err(AppError::new(
                "auth_failed",
                self.message.clone().unwrap_or_else(|| "DNS.COM API failed".to_string()),
            ))
        }
    }
}

#[derive(Debug, Deserialize)]
struct DnscomDomainListData {
    data: Option<Vec<DnscomDomain>>,
}

#[derive(Debug, Deserialize)]
struct DnscomDomain {
    id: u64,
    domain: String,
    record_count: Option<u32>,
    updated_at: Option<String>,
}

#[derive(Debug, Deserialize)]
struct DnscomRecordListData {
    data: Option<Vec<DnscomRecord>>,
}

#[derive(Debug, Deserialize)]
struct DnscomRecord {
    id: u64,
    record: String,
    #[serde(rename = "type")]
    record_type: String,
    value: String,
    ttl: u32,
    mx: Option<u16>,
}

impl DnscomRecord {
    fn to_dns_record(self, domain_name: &str) -> DnsRecord {
        DnsRecord {
            id: self.id.to_string(),
            provider: Provider::Dnscom,
            domain: domain_name.to_string(),
            record_type: self.record_type,
            name: self.record,
            content: self.value,
            ttl: self.ttl,
            mx_priority: self.mx,
            srv_priority: None,
            srv_weight: None,
            srv_port: None,
            caa_flags: None,
            caa_tag: None,
        }
    }
}
