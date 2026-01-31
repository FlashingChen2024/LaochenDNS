mod commands;
mod error;
mod providers;
mod types;
mod vault;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_os::init())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            commands::vault_status,
            commands::vault_initialize,
            commands::vault_unlock,
            commands::integrations_get,
            commands::cloudflare_test,
            commands::cloudflare_save,
            commands::cloudflare_clear,
            commands::dnspod_test,
            commands::dnspod_save,
            commands::dnspod_clear,
            commands::domains_list,
            commands::records_list,
            commands::record_create,
            commands::record_update,
            commands::record_delete
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
