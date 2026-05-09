#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use serde::Serialize;
use std::collections::HashMap;
use std::sync::Mutex;
use tauri::{AppHandle, Emitter, State};

#[derive(Serialize)]
struct RepoSummary {
    id: String,
    name: String,
    local_path: String,
    last_branch_read: String,
}

#[derive(Clone, Serialize)]
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

#[derive(Default)]
struct AppState {
    branch_state: Mutex<BranchState>,
}

#[derive(Default)]
struct BranchState {
    branches_by_repo: HashMap<String, Vec<String>>,
    current_branch_by_repo: HashMap<String, String>,
    sessions_by_project: HashMap<String, Vec<SessionSummary>>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct AgentStatusEvent {
    session_id: String,
    status: String,
    agents: Vec<String>,
    detail: Option<String>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct ResponseChunkEvent {
    session_id: String,
    chunk: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct AgentsMeta {
    agents: Vec<String>,
    role: String,
    mock: bool,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct ResponseDoneEvent {
    session_id: String,
    agents_meta: AgentsMeta,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct BranchChangedEvent {
    session_id: String,
    repo_id: String,
    branch: String,
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

#[tauri::command]
fn get_session_list(
    project_id: String,
    state: State<'_, AppState>,
) -> Result<Vec<SessionSummary>, String> {
    let mut state = state
        .branch_state
        .lock()
        .map_err(|_| "failed to lock backend state".to_string())?;
    seed_mock_state(&mut state);

    Ok(state
        .sessions_by_project
        .get(&project_id)
        .cloned()
        .unwrap_or_default())
}

#[tauri::command]
fn list_branches(
    _project_id: String,
    repo_id: String,
    state: State<'_, AppState>,
) -> Result<Vec<String>, String> {
    let mut state = state
        .branch_state
        .lock()
        .map_err(|_| "failed to lock backend state".to_string())?;
    seed_mock_state(&mut state);

    state
        .branches_by_repo
        .get(&repo_id)
        .cloned()
        .ok_or_else(|| format!("repo not found: {repo_id}"))
}

#[tauri::command]
fn get_current_branch(repo_id: String, state: State<'_, AppState>) -> Result<String, String> {
    let mut state = state
        .branch_state
        .lock()
        .map_err(|_| "failed to lock backend state".to_string())?;
    seed_mock_state(&mut state);

    state
        .current_branch_by_repo
        .get(&repo_id)
        .cloned()
        .ok_or_else(|| format!("repo not found: {repo_id}"))
}

#[tauri::command]
fn checkout_branch(
    app: AppHandle,
    session_id: String,
    repo_id: String,
    branch: String,
    state: State<'_, AppState>,
) -> Result<BranchChangedEvent, String> {
    let event = {
        let mut state = state
            .branch_state
            .lock()
            .map_err(|_| "failed to lock backend state".to_string())?;
        seed_mock_state(&mut state);

        let branches = state
            .branches_by_repo
            .get(&repo_id)
            .ok_or_else(|| format!("repo not found: {repo_id}"))?;

        if !branches.contains(&branch) {
            return Err(format!("unknown branch '{branch}' for repo '{repo_id}'"));
        }

        state
            .current_branch_by_repo
            .insert(repo_id.clone(), branch.clone());
        BranchChangedEvent {
            session_id,
            repo_id,
            branch,
        }
    };

    app.emit("branch_changed", &event)
        .map_err(|e| format!("failed to emit branch_changed: {e}"))?;

    Ok(event)
}

#[tauri::command]
fn send_message(
    app: AppHandle,
    session_id: String,
    message: String,
    role: String,
) -> Result<(), String> {
    if message.trim().is_empty() {
        let error_status = AgentStatusEvent {
            session_id,
            status: "error".to_string(),
            agents: vec!["coordinator".to_string()],
            detail: Some("message must not be empty".to_string()),
        };
        app.emit("agent_status", &error_status)
            .map_err(|e| format!("failed to emit agent_status: {e}"))?;
        return Err("message must not be empty".to_string());
    }

    let agents = vec!["coordinator".to_string()];
    let running_status = AgentStatusEvent {
        session_id: session_id.clone(),
        status: "running".to_string(),
        agents: agents.clone(),
        detail: None,
    };
    app.emit("agent_status", &running_status)
        .map_err(|e| format!("failed to emit agent_status: {e}"))?;

    let chunk = ResponseChunkEvent {
        session_id: session_id.clone(),
        chunk: format!("Mock response for \"{message}\""),
    };
    app.emit("response_chunk", &chunk)
        .map_err(|e| format!("failed to emit response_chunk: {e}"))?;

    let done = ResponseDoneEvent {
        session_id: session_id.clone(),
        agents_meta: AgentsMeta {
            agents: agents.clone(),
            role,
            mock: true,
        },
    };
    app.emit("response_done", &done)
        .map_err(|e| format!("failed to emit response_done: {e}"))?;

    let idle_status = AgentStatusEvent {
        session_id,
        status: "idle".to_string(),
        agents,
        detail: None,
    };
    app.emit("agent_status", &idle_status)
        .map_err(|e| format!("failed to emit agent_status: {e}"))?;

    Ok(())
}

fn seed_mock_state(state: &mut BranchState) {
    if state.branches_by_repo.is_empty() {
        state.branches_by_repo.insert(
            "repo-backend".to_string(),
            vec![
                "main".to_string(),
                "develop".to_string(),
                "feat/chat-session-core".to_string(),
            ],
        );
        state.branches_by_repo.insert(
            "repo-frontend".to_string(),
            vec!["main".to_string(), "feature/chat-ui".to_string()],
        );
    }

    if state.current_branch_by_repo.is_empty() {
        state.current_branch_by_repo.insert(
            "repo-backend".to_string(),
            "feat/chat-session-core".to_string(),
        );
        state
            .current_branch_by_repo
            .insert("repo-frontend".to_string(), "main".to_string());
    }

    if state.sessions_by_project.is_empty() {
        state.sessions_by_project.insert(
            "p1".to_string(),
            vec![
                SessionSummary {
                    id: "s1".to_string(),
                    name: "Backend contract hardening".to_string(),
                    role: "Developer".to_string(),
                    updated_at: 1_778_337_568,
                    excerpt: "Implementing stable chat/session IPC contracts.".to_string(),
                },
                SessionSummary {
                    id: "s2".to_string(),
                    name: "Branch alignment review".to_string(),
                    role: "Architect".to_string(),
                    updated_at: 1_778_336_000,
                    excerpt: "Reviewing branch context propagation across repos.".to_string(),
                },
            ],
        );
    }
}

fn main() {
    tauri::Builder::default()
        .manage(AppState::default())
        .invoke_handler(tauri::generate_handler![
            get_auth_status,
            get_project_list,
            open_chat_window,
            get_session_list,
            list_branches,
            get_current_branch,
            checkout_branch,
            send_message
        ])
        .run(tauri::generate_context!())
        .expect("error while running Agent 42");
}
