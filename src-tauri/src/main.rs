#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use serde::Serialize;

#[derive(Serialize)]
struct RepoSummary {
    id: String,
    name: String,
    local_path: String,
    last_branch_read: String,
}

#[derive(Serialize)]
struct SessionSummary {
    id: String,
    name: String,
    role: String,
    updated_at: i64,
    excerpt: String,
}

#[derive(Serialize)]
struct ProjectSummary {
    id: String,
    name: String,
    repos: Vec<RepoSummary>,
    sessions: Vec<SessionSummary>,
}

#[tauri::command]
fn get_auth_status() -> String {
    "unauthenticated".to_string()
}

#[tauri::command]
fn get_project_list() -> Vec<ProjectSummary> {
    vec![ProjectSummary {
        id: "p1".to_string(),
        name: "Acme Platform".to_string(),
        repos: vec![],
        sessions: vec![],
    }]
}

#[tauri::command]
fn open_chat_window(_project_id: String, _session_id: Option<String>) -> Result<(), String> {
    Ok(())
}

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            get_auth_status,
            get_project_list,
            open_chat_window
        ])
        .run(tauri::generate_context!())
        .expect("error while running Agent 42");
}
