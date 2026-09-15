#![cfg_attr(
    all(not(debug_assertions), target_os = "windows"),
    windows_subsystem = "windows"
)]

use portwatch_core::{PortInfo, get_platform_provider};

#[tauri::command]
async fn list_ports() -> Result<Vec<PortInfo>, String> {
    let provider = get_platform_provider();
    provider.list_ports().map_err(|e| e.to_string())
}

#[tauri::command]
async fn free_port(port: u16, force: bool) -> Result<bool, String> {
    let provider = get_platform_provider();
    provider.free_port(port, force).map_err(|e| e.to_string())
}

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![list_ports, free_port])
        .run(tauri::generate_context!())
        .expect("error while running PortWatch application");
}
