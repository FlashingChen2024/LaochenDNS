use crate::error::AppError;
use crate::providers::{
    aliyun::AliyunClient, baidu::BaiduClient, cloudflare::CloudflareClient, dnscom::DnscomClient,
    dnspod::DnspodClient, huawei::HuaweiClient, rainyun::RainyunClient, tencentcloud::TencentCloudClient,
};
use crate::types::{
    ConflictStrategy, DnsRecord, DomainItem, DomainStatus, IntegrationsInfo, IntegrationInfoItem,
    IntegrationTestResult, Provider, RecordCreateRequest, RecordUpdateRequest, VaultStatus,
};
use crate::vault::{
    self, AliyunCreds, BaiduCreds, CloudflareCreds, DnscomCreds, DnspodCreds, HuaweiCreds, RainyunCreds,
    TencentCloudCreds,
};
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
            aliyun_configured: false,
            huawei_configured: false,
            baidu_configured: false,
            dnscom_configured: false,
            rainyun_configured: false,
            tencentcloud_configured: false,
        });
    }

    let file = vault::read_vault_file(&app)?;
    Ok(VaultStatus {
        initialized: true,
        cloudflare_configured: file.cloudflare_configured,
        dnspod_configured: file.dnspod_configured,
        aliyun_configured: file.aliyun_configured,
        huawei_configured: file.huawei_configured,
        baidu_configured: file.baidu_configured,
        dnscom_configured: file.dnscom_configured,
        rainyun_configured: file.rainyun_configured,
        tencentcloud_configured: file.tencentcloud_configured,
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
    let aliyun = IntegrationInfoItem {
        configured: file.aliyun_configured,
        last_verified_at: plain.aliyun.as_ref().and_then(|c| c.last_verified_at.clone()),
    };
    let huawei = IntegrationInfoItem {
        configured: file.huawei_configured,
        last_verified_at: plain.huawei.as_ref().and_then(|c| c.last_verified_at.clone()),
    };
    let baidu = IntegrationInfoItem {
        configured: file.baidu_configured,
        last_verified_at: plain.baidu.as_ref().and_then(|c| c.last_verified_at.clone()),
    };
    let dnscom = IntegrationInfoItem {
        configured: file.dnscom_configured,
        last_verified_at: plain.dnscom.as_ref().and_then(|c| c.last_verified_at.clone()),
    };
    let rainyun = IntegrationInfoItem {
        configured: file.rainyun_configured,
        last_verified_at: plain.rainyun.as_ref().and_then(|c| c.last_verified_at.clone()),
    };
    let tencentcloud = IntegrationInfoItem {
        configured: file.tencentcloud_configured,
        last_verified_at: plain.tencentcloud.as_ref().and_then(|c| c.last_verified_at.clone()),
    };
    Ok(IntegrationsInfo {
        cloudflare,
        dnspod,
        aliyun,
        huawei,
        baidu,
        dnscom,
        rainyun,
        tencentcloud,
    })
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
pub async fn aliyun_test(access_key_id: String, access_key_secret: String) -> Result<IntegrationTestResult, AppError> {
    let client = AliyunClient::new(access_key_id, access_key_secret)?;
    match client.test().await {
        Ok(_) => Ok(IntegrationTestResult {
            ok: true,
            message: "Aliyun authentication succeeded".to_string(),
        }),
        Err(e) => Ok(IntegrationTestResult {
            ok: false,
            message: e.message,
        }),
    }
}

#[tauri::command]
pub async fn aliyun_save(
    app: AppHandle,
    master_password: String,
    access_key_id: String,
    access_key_secret: String,
) -> Result<(), AppError> {
    let client = AliyunClient::new(access_key_id.clone(), access_key_secret.clone())?;
    client.test().await?;

    let (file, mut plain) = vault::decrypt_vault(&app, &master_password)?;
    let now = Utc::now().to_rfc3339();
    plain.aliyun = Some(AliyunCreds {
        access_key_id,
        access_key_secret,
        last_verified_at: Some(now),
    });

    vault::encrypt_and_save_vault(&app, file, &plain, &master_password)
}

#[tauri::command]
pub fn aliyun_clear(app: AppHandle, master_password: String) -> Result<(), AppError> {
    let (file, mut plain) = vault::decrypt_vault(&app, &master_password)?;
    plain.aliyun = None;
    vault::encrypt_and_save_vault(&app, file, &plain, &master_password)
}

#[tauri::command]
pub async fn huawei_test(token: String) -> Result<IntegrationTestResult, AppError> {
    let client = HuaweiClient::new(token)?;
    match client.test().await {
        Ok(_) => Ok(IntegrationTestResult {
            ok: true,
            message: "Huawei Cloud authentication succeeded".to_string(),
        }),
        Err(e) => Ok(IntegrationTestResult {
            ok: false,
            message: e.message,
        }),
    }
}

#[tauri::command]
pub async fn huawei_save(app: AppHandle, master_password: String, token: String) -> Result<(), AppError> {
    let client = HuaweiClient::new(token.clone())?;
    client.test().await?;

    let (file, mut plain) = vault::decrypt_vault(&app, &master_password)?;
    let now = Utc::now().to_rfc3339();
    plain.huawei = Some(HuaweiCreds {
        token,
        last_verified_at: Some(now),
    });

    vault::encrypt_and_save_vault(&app, file, &plain, &master_password)
}

#[tauri::command]
pub fn huawei_clear(app: AppHandle, master_password: String) -> Result<(), AppError> {
    let (file, mut plain) = vault::decrypt_vault(&app, &master_password)?;
    plain.huawei = None;
    vault::encrypt_and_save_vault(&app, file, &plain, &master_password)
}

#[tauri::command]
pub async fn baidu_test(access_key_id: String, secret_access_key: String) -> Result<IntegrationTestResult, AppError> {
    let client = BaiduClient::new(access_key_id, secret_access_key)?;
    match client.test().await {
        Ok(_) => Ok(IntegrationTestResult {
            ok: true,
            message: "Baidu Cloud authentication succeeded".to_string(),
        }),
        Err(e) => Ok(IntegrationTestResult {
            ok: false,
            message: e.message,
        }),
    }
}

#[tauri::command]
pub async fn baidu_save(
    app: AppHandle,
    master_password: String,
    access_key_id: String,
    secret_access_key: String,
) -> Result<(), AppError> {
    let client = BaiduClient::new(access_key_id.clone(), secret_access_key.clone())?;
    client.test().await?;

    let (file, mut plain) = vault::decrypt_vault(&app, &master_password)?;
    let now = Utc::now().to_rfc3339();
    plain.baidu = Some(BaiduCreds {
        access_key_id,
        secret_access_key,
        last_verified_at: Some(now),
    });

    vault::encrypt_and_save_vault(&app, file, &plain, &master_password)
}

#[tauri::command]
pub fn baidu_clear(app: AppHandle, master_password: String) -> Result<(), AppError> {
    let (file, mut plain) = vault::decrypt_vault(&app, &master_password)?;
    plain.baidu = None;
    vault::encrypt_and_save_vault(&app, file, &plain, &master_password)
}

#[tauri::command]
pub async fn dnscom_test(api_key: String, api_secret: String) -> Result<IntegrationTestResult, AppError> {
    let client = DnscomClient::new(api_key, api_secret)?;
    match client.test().await {
        Ok(_) => Ok(IntegrationTestResult {
            ok: true,
            message: "DNS.COM authentication succeeded".to_string(),
        }),
        Err(e) => Ok(IntegrationTestResult {
            ok: false,
            message: e.message,
        }),
    }
}

#[tauri::command]
pub async fn dnscom_save(
    app: AppHandle,
    master_password: String,
    api_key: String,
    api_secret: String,
) -> Result<(), AppError> {
    let client = DnscomClient::new(api_key.clone(), api_secret.clone())?;
    client.test().await?;

    let (file, mut plain) = vault::decrypt_vault(&app, &master_password)?;
    let now = Utc::now().to_rfc3339();
    plain.dnscom = Some(DnscomCreds {
        api_key,
        api_secret,
        last_verified_at: Some(now),
    });

    vault::encrypt_and_save_vault(&app, file, &plain, &master_password)
}

#[tauri::command]
pub fn dnscom_clear(app: AppHandle, master_password: String) -> Result<(), AppError> {
    let (file, mut plain) = vault::decrypt_vault(&app, &master_password)?;
    plain.dnscom = None;
    vault::encrypt_and_save_vault(&app, file, &plain, &master_password)
}

#[tauri::command]
pub async fn rainyun_test(api_key: String) -> Result<IntegrationTestResult, AppError> {
    let client = RainyunClient::new(api_key)?;
    match client.test().await {
        Ok(_) => Ok(IntegrationTestResult {
            ok: true,
            message: "Rainyun authentication succeeded".to_string(),
        }),
        Err(e) => Ok(IntegrationTestResult {
            ok: false,
            message: e.message,
        }),
    }
}

#[tauri::command]
pub async fn rainyun_save(app: AppHandle, master_password: String, api_key: String) -> Result<(), AppError> {
    let client = RainyunClient::new(api_key.clone())?;
    client.test().await?;

    let (file, mut plain) = vault::decrypt_vault(&app, &master_password)?;
    let now = Utc::now().to_rfc3339();
    plain.rainyun = Some(RainyunCreds {
        api_key,
        last_verified_at: Some(now),
    });

    vault::encrypt_and_save_vault(&app, file, &plain, &master_password)
}

#[tauri::command]
pub fn rainyun_clear(app: AppHandle, master_password: String) -> Result<(), AppError> {
    let (file, mut plain) = vault::decrypt_vault(&app, &master_password)?;
    plain.rainyun = None;
    vault::encrypt_and_save_vault(&app, file, &plain, &master_password)
}

#[tauri::command]
pub async fn tencentcloud_test(app_id: String, secret_id: String) -> Result<IntegrationTestResult, AppError> {
    let client = TencentCloudClient::new(app_id, secret_id)?;
    match client.test().await {
        Ok(_) => Ok(IntegrationTestResult {
            ok: true,
            message: "Tencent Cloud authentication succeeded".to_string(),
        }),
        Err(e) => Ok(IntegrationTestResult {
            ok: false,
            message: e.message,
        }),
    }
}

#[tauri::command]
pub async fn tencentcloud_save(
    app: AppHandle,
    master_password: String,
    app_id: String,
    secret_id: String,
) -> Result<(), AppError> {
    let client = TencentCloudClient::new(app_id.clone(), secret_id.clone())?;
    client.test().await?;

    let (file, mut plain) = vault::decrypt_vault(&app, &master_password)?;
    let now = Utc::now().to_rfc3339();
    plain.tencentcloud = Some(TencentCloudCreds {
        app_id,
        secret_id,
        last_verified_at: Some(now),
    });

    vault::encrypt_and_save_vault(&app, file, &plain, &master_password)
}

#[tauri::command]
pub fn tencentcloud_clear(app: AppHandle, master_password: String) -> Result<(), AppError> {
    let (file, mut plain) = vault::decrypt_vault(&app, &master_password)?;
    plain.tencentcloud = None;
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
    let wants_aliyun = provider_filter.is_none() || provider_filter == Some(Provider::Aliyun);
    let wants_huawei = provider_filter.is_none() || provider_filter == Some(Provider::Huawei);
    let wants_baidu = provider_filter.is_none() || provider_filter == Some(Provider::Baidu);
    let wants_dnscom = provider_filter.is_none() || provider_filter == Some(Provider::Dnscom);
    let wants_rainyun = provider_filter.is_none() || provider_filter == Some(Provider::Rainyun);
    let wants_tencentcloud = provider_filter.is_none() || provider_filter == Some(Provider::Tencentcloud);

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
    let aliyun_creds = plain.aliyun.clone();
    let huawei_creds = plain.huawei.clone();
    let baidu_creds = plain.baidu.clone();
    let dnscom_creds = plain.dnscom.clone();
    let rainyun_creds = plain.rainyun.clone();
    let tencentcloud_creds = plain.tencentcloud.clone();

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

    if wants_aliyun {
        if let Some(aliyun) = aliyun_creds {
            let client = AliyunClient::new(aliyun.access_key_id.clone(), aliyun.access_key_secret.clone())?;
            match client.list_domains().await {
                Ok(mut v) => items.append(&mut v),
                Err(e) => items.push(make_error_item(Provider::Aliyun, "Aliyun", e)),
            }
        } else {
            items.push(DomainItem {
                provider: Provider::Aliyun,
                name: "阿里云DNS".to_string(),
                provider_id: "".to_string(),
                status: DomainStatus::NotConfigured,
                records_count: None,
                last_changed_at: None,
            });
        }
    }

    if wants_huawei {
        if let Some(huawei) = huawei_creds {
            let client = HuaweiClient::new(huawei.token.clone())?;
            match client.list_domains().await {
                Ok(mut v) => items.append(&mut v),
                Err(e) => items.push(make_error_item(Provider::Huawei, "华为云DNS", e)),
            }
        } else {
            items.push(DomainItem {
                provider: Provider::Huawei,
                name: "华为云DNS".to_string(),
                provider_id: "".to_string(),
                status: DomainStatus::NotConfigured,
                records_count: None,
                last_changed_at: None,
            });
        }
    }

    if wants_baidu {
        if let Some(baidu) = baidu_creds {
            let client = BaiduClient::new(baidu.access_key_id.clone(), baidu.secret_access_key.clone())?;
            match client.list_domains().await {
                Ok(mut v) => items.append(&mut v),
                Err(e) => items.push(make_error_item(Provider::Baidu, "百度智能云DNS", e)),
            }
        } else {
            items.push(DomainItem {
                provider: Provider::Baidu,
                name: "百度智能云DNS".to_string(),
                provider_id: "".to_string(),
                status: DomainStatus::NotConfigured,
                records_count: None,
                last_changed_at: None,
            });
        }
    }

    if wants_dnscom {
        if let Some(dnscom) = dnscom_creds {
            let client = DnscomClient::new(dnscom.api_key.clone(), dnscom.api_secret.clone())?;
            match client.list_domains().await {
                Ok(mut v) => items.append(&mut v),
                Err(e) => items.push(make_error_item(Provider::Dnscom, "DNS.COM", e)),
            }
        } else {
            items.push(DomainItem {
                provider: Provider::Dnscom,
                name: "DNS.COM".to_string(),
                provider_id: "".to_string(),
                status: DomainStatus::NotConfigured,
                records_count: None,
                last_changed_at: None,
            });
        }
    }

    if wants_rainyun {
        if let Some(rainyun) = rainyun_creds {
            let client = RainyunClient::new(rainyun.api_key.clone())?;
            match client.list_domains().await {
                Ok(mut v) => items.append(&mut v),
                Err(e) => items.push(make_error_item(Provider::Rainyun, "Rainyun", e)),
            }
        } else {
            items.push(DomainItem {
                provider: Provider::Rainyun,
                name: "雨云DNS".to_string(),
                provider_id: "".to_string(),
                status: DomainStatus::NotConfigured,
                records_count: None,
                last_changed_at: None,
            });
        }
    }

    if wants_tencentcloud {
        if let Some(tc) = tencentcloud_creds {
            let client = TencentCloudClient::new(tc.app_id.clone(), tc.secret_id.clone())?;
            match client.list_domains().await {
                Ok(mut v) => items.append(&mut v),
                Err(e) => items.push(make_error_item(Provider::Tencentcloud, "腾讯云DNS", e)),
            }
        } else {
            items.push(DomainItem {
                provider: Provider::Tencentcloud,
                name: "腾讯云DNS".to_string(),
                provider_id: "".to_string(),
                status: DomainStatus::NotConfigured,
                records_count: None,
                last_changed_at: None,
            });
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
        Provider::Aliyun => {
            let aliyun = plain
                .aliyun
                .ok_or_else(|| AppError::new("not_configured", "Aliyun is not configured"))?;
            let client = AliyunClient::new(aliyun.access_key_id.clone(), aliyun.access_key_secret.clone())?;
            client.list_records(&domain_id, &domain_name).await
        }
        Provider::Huawei => {
            let huawei = plain
                .huawei
                .ok_or_else(|| AppError::new("not_configured", "Huawei Cloud is not configured"))?;
            let client = HuaweiClient::new(huawei.token.clone())?;
            client.list_records(&domain_id, &domain_name).await
        }
        Provider::Baidu => {
            let baidu = plain
                .baidu
                .ok_or_else(|| AppError::new("not_configured", "Baidu Cloud is not configured"))?;
            let client = BaiduClient::new(baidu.access_key_id.clone(), baidu.secret_access_key.clone())?;
            client.list_records(&domain_id, &domain_name).await
        }
        Provider::Dnscom => {
            let dnscom = plain
                .dnscom
                .ok_or_else(|| AppError::new("not_configured", "DNS.COM is not configured"))?;
            let client = DnscomClient::new(dnscom.api_key.clone(), dnscom.api_secret.clone())?;
            client.list_records(&domain_id, &domain_name).await
        }
        Provider::Rainyun => {
            let rainyun = plain
                .rainyun
                .ok_or_else(|| AppError::new("not_configured", "Rainyun is not configured"))?;
            let client = RainyunClient::new(rainyun.api_key.clone())?;
            client.list_records(&domain_id, &domain_name).await
        }
        Provider::Tencentcloud => {
            let tencentcloud = plain
                .tencentcloud
                .ok_or_else(|| AppError::new("not_configured", "Tencent Cloud is not configured"))?;
            let client = TencentCloudClient::new(tencentcloud.app_id.clone(), tencentcloud.secret_id.clone())?;
            client.list_records(&domain_id, &domain_name).await
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
        Provider::Aliyun => {
            let aliyun = plain
                .aliyun
                .ok_or_else(|| AppError::new("not_configured", "Aliyun is not configured"))?;
            let client = AliyunClient::new(aliyun.access_key_id.clone(), aliyun.access_key_secret.clone())?;
            let existing = client.list_records(&domain_id, &domain_name).await?;
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
                        return client.update_record(&domain_id, &domain_name, &update).await;
                    }
                }
            }
            client.create_record(&domain_id, &domain_name, &req).await
        }
        Provider::Huawei => {
            let huawei = plain
                .huawei
                .ok_or_else(|| AppError::new("not_configured", "Huawei Cloud is not configured"))?;
            let client = HuaweiClient::new(huawei.token.clone())?;
            let existing = client.list_records(&domain_id, &domain_name).await?;
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
                        return client.update_record(&domain_id, &domain_name, &update).await;
                    }
                }
            }
            client.create_record(&domain_id, &domain_name, &req).await
        }
        Provider::Baidu => {
            let baidu = plain
                .baidu
                .ok_or_else(|| AppError::new("not_configured", "Baidu Cloud is not configured"))?;
            let client = BaiduClient::new(baidu.access_key_id.clone(), baidu.secret_access_key.clone())?;
            let existing = client.list_records(&domain_id, &domain_name).await?;
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
                        return client.update_record(&domain_id, &domain_name, &update).await;
                    }
                }
            }
            client.create_record(&domain_id, &domain_name, &req).await
        }
        Provider::Dnscom => {
            let dnscom = plain
                .dnscom
                .ok_or_else(|| AppError::new("not_configured", "DNS.COM is not configured"))?;
            let client = DnscomClient::new(dnscom.api_key.clone(), dnscom.api_secret.clone())?;
            let existing = client.list_records(&domain_id, &domain_name).await?;
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
                        return client.update_record(&domain_id, &domain_name, &update).await;
                    }
                }
            }
            client.create_record(&domain_id, &domain_name, &req).await
        }
        Provider::Rainyun => {
            let rainyun = plain
                .rainyun
                .ok_or_else(|| AppError::new("not_configured", "Rainyun is not configured"))?;
            let client = RainyunClient::new(rainyun.api_key.clone())?;
            let existing = client.list_records(&domain_id, &domain_name).await?;
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
                        return client.update_record(&domain_id, &domain_name, &update).await;
                    }
                }
            }
            client.create_record(&domain_id, &domain_name, &req).await
        }
        Provider::Tencentcloud => {
            let tencentcloud = plain
                .tencentcloud
                .ok_or_else(|| AppError::new("not_configured", "Tencent Cloud is not configured"))?;
            let client = TencentCloudClient::new(tencentcloud.app_id.clone(), tencentcloud.secret_id.clone())?;
            let existing = client.list_records(&domain_id, &domain_name).await?;
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
                        return client.update_record(&domain_id, &domain_name, &update).await;
                    }
                }
            }
            client.create_record(&domain_id, &domain_name, &req).await
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
        Provider::Aliyun => {
            let aliyun = plain
                .aliyun
                .ok_or_else(|| AppError::new("not_configured", "Aliyun is not configured"))?;
            let client = AliyunClient::new(aliyun.access_key_id.clone(), aliyun.access_key_secret.clone())?;
            client.update_record(&domain_id, &domain_name, &req).await
        }
        Provider::Huawei => {
            let huawei = plain
                .huawei
                .ok_or_else(|| AppError::new("not_configured", "Huawei Cloud is not configured"))?;
            let client = HuaweiClient::new(huawei.token.clone())?;
            client.update_record(&domain_id, &domain_name, &req).await
        }
        Provider::Baidu => {
            let baidu = plain
                .baidu
                .ok_or_else(|| AppError::new("not_configured", "Baidu Cloud is not configured"))?;
            let client = BaiduClient::new(baidu.access_key_id.clone(), baidu.secret_access_key.clone())?;
            client.update_record(&domain_id, &domain_name, &req).await
        }
        Provider::Dnscom => {
            let dnscom = plain
                .dnscom
                .ok_or_else(|| AppError::new("not_configured", "DNS.COM is not configured"))?;
            let client = DnscomClient::new(dnscom.api_key.clone(), dnscom.api_secret.clone())?;
            client.update_record(&domain_id, &domain_name, &req).await
        }
        Provider::Rainyun => {
            let rainyun = plain
                .rainyun
                .ok_or_else(|| AppError::new("not_configured", "Rainyun is not configured"))?;
            let client = RainyunClient::new(rainyun.api_key.clone())?;
            client.update_record(&domain_id, &domain_name, &req).await
        }
        Provider::Tencentcloud => {
            let tencentcloud = plain
                .tencentcloud
                .ok_or_else(|| AppError::new("not_configured", "Tencent Cloud is not configured"))?;
            let client = TencentCloudClient::new(tencentcloud.app_id.clone(), tencentcloud.secret_id.clone())?;
            client.update_record(&domain_id, &domain_name, &req).await
        }
    }
}

#[tauri::command]
pub async fn record_delete(
    app: AppHandle,
    master_password: String,
    provider: Provider,
    domain_id: String,
    domain_name: String,
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
        Provider::Aliyun => {
            let aliyun = plain
                .aliyun
                .ok_or_else(|| AppError::new("not_configured", "Aliyun is not configured"))?;
            let client = AliyunClient::new(aliyun.access_key_id.clone(), aliyun.access_key_secret.clone())?;
            client.delete_record(&domain_id, &record_id).await
        }
        Provider::Huawei => {
            let huawei = plain
                .huawei
                .ok_or_else(|| AppError::new("not_configured", "Huawei Cloud is not configured"))?;
            let client = HuaweiClient::new(huawei.token.clone())?;
            client.delete_record(&domain_id, &record_id).await
        }
        Provider::Baidu => {
            let baidu = plain
                .baidu
                .ok_or_else(|| AppError::new("not_configured", "Baidu Cloud is not configured"))?;
            let client = BaiduClient::new(baidu.access_key_id.clone(), baidu.secret_access_key.clone())?;
            client.delete_record(&domain_id, &record_id).await
        }
        Provider::Dnscom => {
            let dnscom = plain
                .dnscom
                .ok_or_else(|| AppError::new("not_configured", "DNS.COM is not configured"))?;
            let client = DnscomClient::new(dnscom.api_key.clone(), dnscom.api_secret.clone())?;
            client.delete_record(&domain_id, &domain_name, &record_id).await
        }
        Provider::Rainyun => {
            let rainyun = plain
                .rainyun
                .ok_or_else(|| AppError::new("not_configured", "Rainyun is not configured"))?;
            let client = RainyunClient::new(rainyun.api_key.clone())?;
            client.delete_record(&domain_id, &record_id).await
        }
        Provider::Tencentcloud => {
            let tencentcloud = plain
                .tencentcloud
                .ok_or_else(|| AppError::new("not_configured", "Tencent Cloud is not configured"))?;
            let client = TencentCloudClient::new(tencentcloud.app_id.clone(), tencentcloud.secret_id.clone())?;
            client.delete_record(&domain_id, &domain_name, &record_id).await
        }
    }
}

 
