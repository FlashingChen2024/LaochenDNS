use crate::error::AppError;
use crate::providers::{cloudflare::CloudflareClient, dnspod::DnspodClient};
use crate::types::{
    ConflictStrategy, DnsRecord, DomainItem, DomainStatus, IntegrationsInfo, IntegrationInfoItem,
    IntegrationTestResult, Provider, RecordCreateRequest, RecordUpdateRequest, VaultStatus,
};
use crate::vault::{self, CloudflareCreds, DnspodCreds};
use chrono::Utc;
use std::net::{Ipv4Addr, Ipv6Addr};
use tauri::AppHandle;

#[tauri::command]
pub fn vault_status(app: AppHandle) -> Result<VaultStatus, AppError> {
    if !vault::vault_exists(&app) {
        return Ok(VaultStatus {
            initialized: false,
            cloudflare_configured: false,
            dnspod_configured: false,
        });
    }

    let file = vault::read_vault_file(&app)?;
    Ok(VaultStatus {
        initialized: true,
        cloudflare_configured: file.cloudflare_configured,
        dnspod_configured: file.dnspod_configured,
    })
}

#[tauri::command]
pub fn vault_initialize(app: AppHandle, master_password: String) -> Result<(), AppError> {
    if master_password.len() < 8 {
        return Err(AppError::new("invalid_input", "Master password must be at least 8 characters"));
    }
    vault::initialize_vault(&app, &master_password)
}

#[tauri::command]
pub fn vault_unlock(app: AppHandle, master_password: String) -> Result<(), AppError> {
    let _ = vault::decrypt_vault(&app, &master_password)?;
    Ok(())
}

#[tauri::command]
pub fn integrations_get(app: AppHandle, master_password: String) -> Result<IntegrationsInfo, AppError> {
    let (file, plain) = vault::decrypt_vault(&app, &master_password)?;
    let cloudflare = IntegrationInfoItem {
        configured: file.cloudflare_configured,
        last_verified_at: plain.cloudflare.as_ref().and_then(|c| c.last_verified_at.clone()),
    };
    let dnspod = IntegrationInfoItem {
        configured: file.dnspod_configured,
        last_verified_at: plain.dnspod.as_ref().and_then(|c| c.last_verified_at.clone()),
    };
    Ok(IntegrationsInfo { cloudflare, dnspod })
}


#[tauri::command]
pub async fn cloudflare_test(email: String, api_key: String) -> Result<IntegrationTestResult, AppError> {
    let client = CloudflareClient::new(email, api_key)?;
    match client.test().await {
        Ok(_) => Ok(IntegrationTestResult {
            ok: true,
            message: "Cloudflare authentication succeeded".to_string(),
        }),
        Err(e) => Ok(IntegrationTestResult {
            ok: false,
            message: e.message,
        }),
    }
}

#[tauri::command]
pub async fn cloudflare_save(
    app: AppHandle,
    master_password: String,
    email: String,
    api_key: String,
) -> Result<(), AppError> {
    let client = CloudflareClient::new(email.clone(), api_key.clone())?;
    client.test().await?;

    let (file, mut plain) = vault::decrypt_vault(&app, &master_password)?;
    let now = Utc::now().to_rfc3339();
    plain.cloudflare = Some(CloudflareCreds {
        email,
        api_key,
        last_verified_at: Some(now),
    });

    vault::encrypt_and_save_vault(&app, file, &plain, &master_password)
}

#[tauri::command]
pub fn cloudflare_clear(app: AppHandle, master_password: String) -> Result<(), AppError> {
    let (file, mut plain) = vault::decrypt_vault(&app, &master_password)?;
    plain.cloudflare = None;
    vault::encrypt_and_save_vault(&app, file, &plain, &master_password)
}

#[tauri::command]
pub async fn dnspod_test(token_id: String, token: String) -> Result<IntegrationTestResult, AppError> {
    let client = DnspodClient::new(token_id, token)?;
    match client.test().await {
        Ok(_) => Ok(IntegrationTestResult {
            ok: true,
            message: "DNSPod authentication succeeded".to_string(),
        }),
        Err(e) => Ok(IntegrationTestResult {
            ok: false,
            message: e.message,
        }),
    }
}

#[tauri::command]
pub async fn dnspod_save(
    app: AppHandle,
    master_password: String,
    token_id: String,
    token: String,
) -> Result<(), AppError> {
    let client = DnspodClient::new(token_id.clone(), token.clone())?;
    client.test().await?;

    let (file, mut plain) = vault::decrypt_vault(&app, &master_password)?;
    let now = Utc::now().to_rfc3339();
    plain.dnspod = Some(DnspodCreds {
        token_id,
        token,
        last_verified_at: Some(now),
    });

    vault::encrypt_and_save_vault(&app, file, &plain, &master_password)
}

#[tauri::command]
pub fn dnspod_clear(app: AppHandle, master_password: String) -> Result<(), AppError> {
    let (file, mut plain) = vault::decrypt_vault(&app, &master_password)?;
    plain.dnspod = None;
    vault::encrypt_and_save_vault(&app, file, &plain, &master_password)
}

#[tauri::command]
pub async fn domains_list(
    app: AppHandle,
    master_password: String,
    provider_filter: Option<Provider>,
    search: Option<String>,
) -> Result<Vec<DomainItem>, AppError> {
    let (_, plain) = vault::decrypt_vault(&app, &master_password)?;
    let mut items: Vec<DomainItem> = Vec::new();

    let search_norm = search.unwrap_or_default().to_lowercase();
    let wants_cloudflare = provider_filter.is_none() || provider_filter == Some(Provider::Cloudflare);
    let wants_dnspod = provider_filter.is_none() || provider_filter == Some(Provider::Dnspod);

    let make_error_item = |provider: Provider, display_name: &str, e: AppError| {
        let status = match e.code.as_str() {
            "auth_failed" => DomainStatus::AuthFailed,
            "unreachable" | "timeout" => DomainStatus::Unreachable,
            _ => DomainStatus::FetchFailed,
        };
        DomainItem {
            provider,
            name: format!("{display_name} (错误: {})", e.message),
            provider_id: "".to_string(),
            status,
            records_count: None,
            last_changed_at: None,
        }
    };

    let cf_creds = plain.cloudflare.clone();
    let dp_creds = plain.dnspod.clone();

    if wants_cloudflare && wants_dnspod {
        match (cf_creds, dp_creds) {
            (Some(cf), Some(dp)) => {
                let cf_client = CloudflareClient::new(cf.email.clone(), cf.api_key.clone())?;
                let dp_client = DnspodClient::new(dp.token_id.clone(), dp.token.clone())?;
                let cf_result = cf_client.list_domains().await;
                let dp_result = dp_client.list_domains().await;
                match cf_result {
                    Ok(mut v) => items.append(&mut v),
                    Err(e) => items.push(make_error_item(Provider::Cloudflare, "Cloudflare", e)),
                }
                match dp_result {
                    Ok(mut v) => items.append(&mut v),
                    Err(e) => items.push(make_error_item(Provider::Dnspod, "DNSPod", e)),
                }
            }
            (Some(cf), None) => {
                let cf_client = CloudflareClient::new(cf.email.clone(), cf.api_key.clone())?;
                match cf_client.list_domains().await {
                    Ok(mut v) => items.append(&mut v),
                    Err(e) => items.push(make_error_item(Provider::Cloudflare, "Cloudflare", e)),
                }
                items.push(DomainItem {
                    provider: Provider::Dnspod,
                    name: "DNSPod".to_string(),
                    provider_id: "".to_string(),
                    status: DomainStatus::NotConfigured,
                    records_count: None,
                    last_changed_at: None,
                });
            }
            (None, Some(dp)) => {
                items.push(DomainItem {
                    provider: Provider::Cloudflare,
                    name: "Cloudflare".to_string(),
                    provider_id: "".to_string(),
                    status: DomainStatus::NotConfigured,
                    records_count: None,
                    last_changed_at: None,
                });
                let dp_client = DnspodClient::new(dp.token_id.clone(), dp.token.clone())?;
                match dp_client.list_domains().await {
                    Ok(mut v) => items.append(&mut v),
                    Err(e) => items.push(make_error_item(Provider::Dnspod, "DNSPod", e)),
                }
            }
            (None, None) => {
                items.push(DomainItem {
                    provider: Provider::Cloudflare,
                    name: "Cloudflare".to_string(),
                    provider_id: "".to_string(),
                    status: DomainStatus::NotConfigured,
                    records_count: None,
                    last_changed_at: None,
                });
                items.push(DomainItem {
                    provider: Provider::Dnspod,
                    name: "DNSPod".to_string(),
                    provider_id: "".to_string(),
                    status: DomainStatus::NotConfigured,
                    records_count: None,
                    last_changed_at: None,
                });
            }
        }
    } else {
        if wants_cloudflare {
            if let Some(cf) = cf_creds {
                let cf_client = CloudflareClient::new(cf.email.clone(), cf.api_key.clone())?;
                match cf_client.list_domains().await {
                    Ok(mut v) => items.append(&mut v),
                    Err(e) => items.push(make_error_item(Provider::Cloudflare, "Cloudflare", e)),
                }
            } else {
                items.push(DomainItem {
                    provider: Provider::Cloudflare,
                    name: "Cloudflare".to_string(),
                    provider_id: "".to_string(),
                    status: DomainStatus::NotConfigured,
                    records_count: None,
                    last_changed_at: None,
                });
            }
        }

        if wants_dnspod {
            if let Some(dp) = dp_creds {
                let dp_client = DnspodClient::new(dp.token_id.clone(), dp.token.clone())?;
                match dp_client.list_domains().await {
                    Ok(mut v) => items.append(&mut v),
                    Err(e) => items.push(make_error_item(Provider::Dnspod, "DNSPod", e)),
                }
            } else {
                items.push(DomainItem {
                    provider: Provider::Dnspod,
                    name: "DNSPod".to_string(),
                    provider_id: "".to_string(),
                    status: DomainStatus::NotConfigured,
                    records_count: None,
                    last_changed_at: None,
                });
            }
        }
    }

    if search_norm.is_empty() {
        return Ok(items);
    }

    Ok(items
        .into_iter()
        .filter(|d| d.name.to_lowercase().contains(&search_norm))
        .collect())
}

#[tauri::command]
pub async fn records_list(
    app: AppHandle,
    master_password: String,
    provider: Provider,
    domain_id: String,
    domain_name: String,
) -> Result<Vec<DnsRecord>, AppError> {
    let (_, plain) = vault::decrypt_vault(&app, &master_password)?;
    match provider {
        Provider::Cloudflare => {
            let cf = plain
                .cloudflare
                .ok_or_else(|| AppError::new("not_configured", "Cloudflare is not configured"))?;
            let cf_client = CloudflareClient::new(cf.email.clone(), cf.api_key.clone())?;
            cf_client.list_records(&domain_id, &domain_name).await
        }
        Provider::Dnspod => {
            let dp = plain
                .dnspod
                .ok_or_else(|| AppError::new("not_configured", "DNSPod is not configured"))?;
            let dp_client = DnspodClient::new(dp.token_id.clone(), dp.token.clone())?;
            dp_client.list_records(&domain_id, &domain_name).await
        }
    }
}

#[tauri::command]
pub async fn record_create(
    app: AppHandle,
    master_password: String,
    provider: Provider,
    domain_id: String,
    domain_name: String,
    req: RecordCreateRequest,
) -> Result<DnsRecord, AppError> {
    let (_, plain) = vault::decrypt_vault(&app, &master_password)?;
    validate_record_request(&req)?;

    match provider {
        Provider::Cloudflare => {
            let cf = plain
                .cloudflare
                .ok_or_else(|| AppError::new("not_configured", "Cloudflare is not configured"))?;
            let cf_client = CloudflareClient::new(cf.email.clone(), cf.api_key.clone())?;
            let conflict_ids = cf_client
                .find_conflict_ids(&domain_id, &domain_name, &req.record_type, &req.name)
                .await?;
            if !conflict_ids.is_empty() {
                match req.conflict_strategy {
                    ConflictStrategy::DoNotCreate => {
                        return Err(AppError::new("conflict", "Record already exists"));
                    }
                    ConflictStrategy::Overwrite => {
                        if conflict_ids.len() != 1 {
                            return Err(AppError::new("conflict", "Multiple conflicting records found"));
                        }
                        let update = RecordUpdateRequest {
                            id: conflict_ids[0].clone(),
                            record_type: req.record_type,
                            name: req.name,
                            content: req.content,
                            ttl: req.ttl,
                            mx_priority: req.mx_priority,
                            srv_priority: req.srv_priority,
                            srv_weight: req.srv_weight,
                            srv_port: req.srv_port,
                            caa_flags: req.caa_flags,
                            caa_tag: req.caa_tag,
                        };
                        return cf_client.update_record(&domain_id, &domain_name, &update).await;
                    }
                }
            }
            cf_client.create_record(&domain_id, &domain_name, &req).await
        }
        Provider::Dnspod => {
            let dp = plain
                .dnspod
                .ok_or_else(|| AppError::new("not_configured", "DNSPod is not configured"))?;
            let dp_client = DnspodClient::new(dp.token_id.clone(), dp.token.clone())?;
            let existing = dp_client.list_records(&domain_id, &domain_name).await?;
            let conflicts: Vec<&DnsRecord> = existing
                .iter()
                .filter(|r| r.record_type == req.record_type && r.name == req.name)
                .collect();
            if !conflicts.is_empty() {
                match req.conflict_strategy {
                    ConflictStrategy::DoNotCreate => {
                        return Err(AppError::new("conflict", "Record already exists"));
                    }
                    ConflictStrategy::Overwrite => {
                        if conflicts.len() != 1 {
                            return Err(AppError::new("conflict", "Multiple conflicting records found"));
                        }
                        let update = RecordUpdateRequest {
                            id: conflicts[0].id.clone(),
                            record_type: req.record_type,
                            name: req.name,
                            content: req.content,
                            ttl: req.ttl,
                            mx_priority: req.mx_priority,
                            srv_priority: req.srv_priority,
                            srv_weight: req.srv_weight,
                            srv_port: req.srv_port,
                            caa_flags: req.caa_flags,
                            caa_tag: req.caa_tag,
                        };
                        return dp_client.update_record(&domain_id, &domain_name, &update).await;
                    }
                }
            }
            dp_client.create_record(&domain_id, &domain_name, &req).await
        }
    }
}

fn validate_record_request(req: &RecordCreateRequest) -> Result<(), AppError> {
    let valid_types = ["A", "AAAA", "CNAME", "TXT", "MX", "NS", "SRV", "CAA"];
    if !valid_types.contains(&req.record_type.as_str()) {
        return Err(AppError::new("invalid_type", format!("不支持的记录类型: {}", req.record_type)));
    }

    let name = req.name.trim();
    if name.is_empty() {
        return Err(AppError::new("invalid_name", "主机记录不能为空"));
    }

    let content = req.content.trim();
    if content.is_empty() {
        return Err(AppError::new("invalid_content", "记录值不能为空"));
    }

    if req.ttl < 60 || req.ttl > 86400 {
        return Err(AppError::new("invalid_ttl", "TTL 必须在 60-86400 秒之间"));
    }

    match req.record_type.as_str() {
        "A" => {
            if content.parse::<Ipv4Addr>().is_err() {
                return Err(AppError::new("invalid_content", "A 记录必须是有效的 IPv4 地址"));
            }
        }
        "AAAA" => {
            if content.parse::<Ipv6Addr>().is_err() {
                return Err(AppError::new("invalid_content", "AAAA 记录必须是有效的 IPv6 地址"));
            }
        }
        "CNAME" | "NS" => {
            if !content.contains('.') {
                return Err(AppError::new("invalid_content", "记录值必须是有效域名"));
            }
        }
        "MX" => {
            if req.mx_priority.is_none() {
                return Err(AppError::new("missing_field", "MX 记录必须设置优先级"));
            }
        }
        "SRV" => {
            if req.srv_priority.is_none() || req.srv_weight.is_none() || req.srv_port.is_none() {
                return Err(AppError::new("missing_field", "SRV 记录必须设置优先级、权重和端口"));
            }
            let parts: Vec<&str> = name.split('.').collect();
            if parts.len() < 2 || !parts[0].starts_with('_') || !parts[1].starts_with('_') {
                return Err(AppError::new("invalid_name", "SRV 主机记录需为 _service._proto 形式"));
            }
        }
        "CAA" => {
            if let Some(tag) = &req.caa_tag {
                if tag.trim().is_empty() {
                    return Err(AppError::new("invalid_caa_tag", "CAA Tag 不能为空"));
                }
            }
        }
        _ => {}
    }

    Ok(())
}

#[tauri::command]
pub async fn record_update(
    app: AppHandle,
    master_password: String,
    provider: Provider,
    domain_id: String,
    domain_name: String,
    req: RecordUpdateRequest,
) -> Result<DnsRecord, AppError> {
    let (_, plain) = vault::decrypt_vault(&app, &master_password)?;
    match provider {
        Provider::Cloudflare => {
            let cf = plain
                .cloudflare
                .ok_or_else(|| AppError::new("not_configured", "Cloudflare is not configured"))?;
            let cf_client = CloudflareClient::new(cf.email.clone(), cf.api_key.clone())?;
            cf_client.update_record(&domain_id, &domain_name, &req).await
        }
        Provider::Dnspod => {
            let dp = plain
                .dnspod
                .ok_or_else(|| AppError::new("not_configured", "DNSPod is not configured"))?;
            let dp_client = DnspodClient::new(dp.token_id.clone(), dp.token.clone())?;
            dp_client.update_record(&domain_id, &domain_name, &req).await
        }
    }
}

#[tauri::command]
pub async fn record_delete(
    app: AppHandle,
    master_password: String,
    provider: Provider,
    domain_id: String,
    record_id: String,
) -> Result<(), AppError> {
    let (_, plain) = vault::decrypt_vault(&app, &master_password)?;
    match provider {
        Provider::Cloudflare => {
            let cf = plain
                .cloudflare
                .ok_or_else(|| AppError::new("not_configured", "Cloudflare is not configured"))?;
            let cf_client = CloudflareClient::new(cf.email.clone(), cf.api_key.clone())?;
            cf_client.delete_record(&domain_id, &record_id).await
        }
        Provider::Dnspod => {
            let dp = plain
                .dnspod
                .ok_or_else(|| AppError::new("not_configured", "DNSPod is not configured"))?;
            let dp_client = DnspodClient::new(dp.token_id.clone(), dp.token.clone())?;
            dp_client.delete_record(&domain_id, &record_id).await
        }
    }
}

 
