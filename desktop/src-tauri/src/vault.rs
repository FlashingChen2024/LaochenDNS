use crate::error::AppError;
use aes_gcm::aead::{Aead, KeyInit};
use aes_gcm::{Aes256Gcm, Nonce};
use argon2::{Algorithm, Argon2, Params, Version};
use base64::Engine;
use rand::RngCore;
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::fs;
use std::path::{Path, PathBuf};
use tauri::{AppHandle, Manager};
use zeroize::Zeroize;

const VAULT_FILENAME: &str = "vault.json";
const VAULT_VERSION: u32 = 1;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VaultFile {
    pub version: u32,
    pub kdf_salt_b64: String,
    pub key_check_b64: String,
    pub cloudflare_configured: bool,
    pub dnspod_configured: bool,
    pub nonce_b64: String,
    pub ciphertext_b64: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct PlainVault {
    pub cloudflare: Option<CloudflareCreds>,
    pub dnspod: Option<DnspodCreds>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CloudflareCreds {
    pub email: String,
    pub api_key: String,
    pub last_verified_at: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DnspodCreds {
    pub token_id: String,
    pub token: String,
    pub last_verified_at: Option<String>,
}

pub fn vault_path(app: &AppHandle) -> Result<PathBuf, AppError> {
    let dir = app
        .path()
        .app_data_dir()
        .map_err(|e| AppError::new("path_error", e.to_string()))?;
    Ok(dir.join(VAULT_FILENAME))
}

pub fn vault_exists(app: &AppHandle) -> bool {
    vault_path(app).map(|p| p.exists()).unwrap_or(false)
}

pub fn read_vault_file(app: &AppHandle) -> Result<VaultFile, AppError> {
    let path = vault_path(app)?;
    let content = fs::read_to_string(path).map_err(|e| AppError::new("io_error", e.to_string()))?;
    let parsed: VaultFile =
        serde_json::from_str(&content).map_err(|e| AppError::new("parse_error", e.to_string()))?;
    Ok(parsed)
}

pub fn write_vault_file(app: &AppHandle, file: &VaultFile) -> Result<(), AppError> {
    let path = vault_path(app)?;
    ensure_parent_dir(&path)?;
    let content =
        serde_json::to_string_pretty(file).map_err(|e| AppError::new("serialize_error", e.to_string()))?;
    fs::write(path, content).map_err(|e| AppError::new("io_error", e.to_string()))?;
    Ok(())
}

pub fn initialize_vault(app: &AppHandle, master_password: &str) -> Result<(), AppError> {
    if vault_exists(app) {
        return Err(AppError::new("already_initialized", "Vault already exists"));
    }

    let mut salt = [0u8; 16];
    rand::thread_rng().fill_bytes(&mut salt);

    let mut key = derive_key(master_password, &salt)?;

    let mut check = Sha256::digest(&key);
    let check_b64 = base64::engine::general_purpose::STANDARD.encode(&check);

    let plain = PlainVault::default();
    let plaintext =
        serde_json::to_vec(&plain).map_err(|e| AppError::new("serialize_error", e.to_string()))?;

    let mut nonce = [0u8; 12];
    rand::thread_rng().fill_bytes(&mut nonce);

    let cipher = Aes256Gcm::new_from_slice(&key).map_err(|e| AppError::new("crypto_error", e.to_string()))?;
    let ciphertext = cipher
        .encrypt(Nonce::from_slice(&nonce), plaintext.as_ref())
        .map_err(|e| AppError::new("crypto_error", e.to_string()))?;

    key.zeroize();
    check.zeroize();

    let file = VaultFile {
        version: VAULT_VERSION,
        kdf_salt_b64: base64::engine::general_purpose::STANDARD.encode(salt),
        key_check_b64: check_b64,
        cloudflare_configured: false,
        dnspod_configured: false,
        nonce_b64: base64::engine::general_purpose::STANDARD.encode(nonce),
        ciphertext_b64: base64::engine::general_purpose::STANDARD.encode(ciphertext),
    };

    write_vault_file(app, &file)?;
    Ok(())
}

pub fn decrypt_vault(app: &AppHandle, master_password: &str) -> Result<(VaultFile, PlainVault), AppError> {
    let file = read_vault_file(app)?;
    if file.version != VAULT_VERSION {
        return Err(AppError::new("unsupported_version", "Unsupported vault version"));
    }

    let salt = decode_b64_16(&file.kdf_salt_b64)?;
    let mut key = derive_key(master_password, &salt)?;

    let mut check = Sha256::digest(&key);
    let check_b64 = base64::engine::general_purpose::STANDARD.encode(&check);
    if check_b64 != file.key_check_b64 {
        key.zeroize();
        check.zeroize();
        return Err(AppError::new("invalid_master_password", "Invalid master password"));
    }

    let nonce = decode_b64_12(&file.nonce_b64)?;
    let ciphertext = decode_b64_any(&file.ciphertext_b64)?;

    let cipher = Aes256Gcm::new_from_slice(&key).map_err(|e| AppError::new("crypto_error", e.to_string()))?;
    let plaintext = cipher
        .decrypt(Nonce::from_slice(&nonce), ciphertext.as_ref())
        .map_err(|_| AppError::new("invalid_master_password", "Invalid master password"))?;

    let plain: PlainVault =
        serde_json::from_slice(&plaintext).map_err(|e| AppError::new("parse_error", e.to_string()))?;

    key.zeroize();
    check.zeroize();

    Ok((file, plain))
}

pub fn encrypt_and_save_vault(
    app: &AppHandle,
    mut file: VaultFile,
    plain: &PlainVault,
    master_password: &str,
) -> Result<(), AppError> {
    let salt = decode_b64_16(&file.kdf_salt_b64)?;
    let mut key = derive_key(master_password, &salt)?;

    let mut check = Sha256::digest(&key);
    let check_b64 = base64::engine::general_purpose::STANDARD.encode(&check);
    if check_b64 != file.key_check_b64 {
        key.zeroize();
        check.zeroize();
        return Err(AppError::new("invalid_master_password", "Invalid master password"));
    }

    let plaintext =
        serde_json::to_vec(plain).map_err(|e| AppError::new("serialize_error", e.to_string()))?;

    let mut nonce = [0u8; 12];
    rand::thread_rng().fill_bytes(&mut nonce);

    let cipher = Aes256Gcm::new_from_slice(&key).map_err(|e| AppError::new("crypto_error", e.to_string()))?;
    let ciphertext = cipher
        .encrypt(Nonce::from_slice(&nonce), plaintext.as_ref())
        .map_err(|e| AppError::new("crypto_error", e.to_string()))?;

    file.cloudflare_configured = plain.cloudflare.is_some();
    file.dnspod_configured = plain.dnspod.is_some();
    file.nonce_b64 = base64::engine::general_purpose::STANDARD.encode(nonce);
    file.ciphertext_b64 = base64::engine::general_purpose::STANDARD.encode(ciphertext);

    key.zeroize();
    check.zeroize();

    write_vault_file(app, &file)
}

fn derive_key(master_password: &str, salt: &[u8; 16]) -> Result<[u8; 32], AppError> {
    let params =
        Params::new(19_456, 2, 1, Some(32)).map_err(|e| AppError::new("crypto_error", e.to_string()))?;
    let argon2 = Argon2::new(Algorithm::Argon2id, Version::V0x13, params);

    let mut key = [0u8; 32];
    argon2
        .hash_password_into(master_password.as_bytes(), salt, &mut key)
        .map_err(|e| AppError::new("crypto_error", e.to_string()))?;
    Ok(key)
}

fn ensure_parent_dir(path: &Path) -> Result<(), AppError> {
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|e| AppError::new("io_error", e.to_string()))?;
    }
    Ok(())
}

fn decode_b64_16(value: &str) -> Result<[u8; 16], AppError> {
    let bytes = base64::engine::general_purpose::STANDARD
        .decode(value)
        .map_err(|e| AppError::new("parse_error", e.to_string()))?;
    let arr: [u8; 16] = bytes
        .try_into()
        .map_err(|_| AppError::new("parse_error", "Invalid salt length"))?;
    Ok(arr)
}

fn decode_b64_12(value: &str) -> Result<[u8; 12], AppError> {
    let bytes = base64::engine::general_purpose::STANDARD
        .decode(value)
        .map_err(|e| AppError::new("parse_error", e.to_string()))?;
    let arr: [u8; 12] = bytes
        .try_into()
        .map_err(|_| AppError::new("parse_error", "Invalid nonce length"))?;
    Ok(arr)
}

fn decode_b64_any(value: &str) -> Result<Vec<u8>, AppError> {
    base64::engine::general_purpose::STANDARD
        .decode(value)
        .map_err(|e| AppError::new("parse_error", e.to_string()))
}

