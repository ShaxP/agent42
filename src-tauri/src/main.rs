#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs;
use std::io::{BufRead, BufReader, Read};
use std::path::Path;
use std::path::PathBuf;
use std::process::{Command, Stdio};
use std::sync::mpsc::{self, RecvTimeoutError};
use std::sync::Mutex;
use std::time::{Duration, SystemTime, UNIX_EPOCH};
use tauri::{AppHandle, Emitter, Manager, State};

const STATE_SCHEMA_VERSION: u32 = 1;
const DEFAULT_MERMAID_SKILL: &str = r#"# Mermaid Diagram Authoring

Use these rules whenever you output Mermaid diagrams:

1. Quote node labels when they contain punctuation such as (), :, /, <, >, commas, or mixed symbols.
   - Prefer: L2["lib/api.ts suggestTags()"]
   - Avoid:  L2[lib/api.ts suggestTags()]
2. Keep graph syntax Mermaid-compatible; avoid unescaped special characters in unquoted labels.
3. Before finalizing, validate Mermaid syntax mentally and rewrite suspicious labels to quoted form.
4. If a diagram might fail to parse, provide a corrected Mermaid block immediately.
"#;

#[derive(Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct RepoSummary {
    id: String,
    name: String,
    local_path: String,
    last_branch_read: String,
}

#[derive(Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct SessionSummary {
    id: String,
    name: String,
    role: String,
    updated_at: i64,
    excerpt: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct ProjectSummary {
    id: String,
    name: String,
    squad_path: String,
    repos: Vec<RepoSummary>,
    sessions: Vec<SessionSummary>,
}

#[derive(Clone, Serialize, Deserialize)]
struct ProjectRecord {
    id: String,
    name: String,
    #[serde(default)]
    squad_path: String,
    repos: Vec<RepoSummary>,
}

struct AppState {
    branch_state: Mutex<BranchState>,
    state_file_path: PathBuf,
}

#[derive(Clone, Default, Serialize, Deserialize)]
struct BranchState {
    #[serde(default)]
    next_project_seq: u64,
    #[serde(default)]
    next_repo_seq: u64,
    #[serde(default)]
    next_session_seq: u64,
    #[serde(default)]
    projects: Vec<ProjectRecord>,
    #[serde(default)]
    branches_by_repo: HashMap<String, Vec<String>>,
    #[serde(default)]
    current_branch_by_repo: HashMap<String, String>,
    #[serde(default)]
    sessions_by_project: HashMap<String, Vec<SessionSummary>>,
}

#[derive(Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct PersistedState {
    schema_version: u32,
    #[serde(default)]
    branch_state: BranchState,
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

#[derive(Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct ChatAgentsMetaRecord {
    agents: Vec<String>,
    user_role: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    tier: Option<String>,
}

#[derive(Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct ChatMessageRecord {
    id: String,
    role: String,
    content: String,
    timestamp: i64,
    #[serde(skip_serializing_if = "Option::is_none")]
    agents_meta: Option<ChatAgentsMetaRecord>,
}

#[tauri::command]
fn get_auth_status() -> String {
    if has_github_auth() {
        "authenticated".to_string()
    } else {
        "unauthenticated".to_string()
    }
}

#[tauri::command]
fn sign_in_with_github_copilot() -> Result<String, String> {
    if has_github_auth() {
        return Ok("authenticated".to_string());
    }

    let output = Command::new("gh")
        .args([
            "auth",
            "login",
            "--hostname",
            "github.com",
            "--web",
            "--git-protocol",
            "https",
            "--skip-ssh-key",
        ])
        .output()
        .map_err(|e| format!("failed to launch GitHub authentication: {e}"))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr).trim().to_string();
        let stdout = String::from_utf8_lossy(&output.stdout).trim().to_string();
        let detail = if !stderr.is_empty() { stderr } else { stdout };
        return Err(if detail.is_empty() {
            "GitHub authentication did not complete. Run `gh auth login --web` in a terminal and try again.".to_string()
        } else {
            detail
        });
    }

    if has_github_auth() {
        Ok("authenticated".to_string())
    } else {
        Err("Authentication command completed but GitHub is still not authenticated. Run `gh auth login --web` in a terminal and try again.".to_string())
    }
}

#[tauri::command]
fn get_project_list(state: State<'_, AppState>) -> Result<Vec<ProjectSummary>, String> {
    let mut branch_state = state
        .branch_state
        .lock()
        .map_err(|_| "failed to lock backend state".to_string())?;
    normalize_branch_state(&mut branch_state);

    if sync_project_squad_paths(&state, &mut branch_state)? {
        persist_locked_state(&state, &branch_state)?;
    }

    Ok(branch_state
        .projects
        .iter()
        .map(|project| ProjectSummary {
            id: project.id.clone(),
            name: project.name.clone(),
            squad_path: project.squad_path.clone(),
            repos: project
                .repos
                .iter()
                .map(|repo| RepoSummary {
                    id: repo.id.clone(),
                    name: repo.name.clone(),
                    local_path: repo.local_path.clone(),
                    last_branch_read: git_current_branch(&repo.local_path).unwrap_or_else(|_| {
                        branch_state
                            .current_branch_by_repo
                            .get(&repo.id)
                            .cloned()
                            .unwrap_or_else(|| repo.last_branch_read.clone())
                    }),
                })
                .collect(),
            sessions: branch_state
                .sessions_by_project
                .get(&project.id)
                .cloned()
                .unwrap_or_default(),
        })
        .collect())
}

#[tauri::command]
fn create_project(name: String, state: State<'_, AppState>) -> Result<ProjectSummary, String> {
    let trimmed_name = name.trim();
    if trimmed_name.is_empty() {
        return Err("project name must not be empty".to_string());
    }

    let mut branch_state = state
        .branch_state
        .lock()
        .map_err(|_| "failed to lock backend state".to_string())?;
    normalize_branch_state(&mut branch_state);

    let project_id = next_project_id(&mut branch_state);
    let squad_path = ensure_project_squad_bootstrap(&state, &project_id, trimmed_name)?;
    let project = ProjectRecord {
        id: project_id.clone(),
        name: trimmed_name.to_string(),
        squad_path: squad_path.clone(),
        repos: Vec::new(),
    };

    branch_state.projects.insert(0, project.clone());
    branch_state
        .sessions_by_project
        .entry(project_id.clone())
        .or_default();
    persist_locked_state(&state, &branch_state)?;

    Ok(ProjectSummary {
        id: project_id,
        name: project.name,
        squad_path,
        repos: project.repos,
        sessions: Vec::new(),
    })
}

#[tauri::command]
fn rename_project(
    project_id: String,
    name: String,
    state: State<'_, AppState>,
) -> Result<ProjectSummary, String> {
    let trimmed_name = name.trim();
    if trimmed_name.is_empty() {
        return Err("project name must not be empty".to_string());
    }

    let mut branch_state = state
        .branch_state
        .lock()
        .map_err(|_| "failed to lock backend state".to_string())?;
    normalize_branch_state(&mut branch_state);

    let project_index = branch_state
        .projects
        .iter()
        .position(|project| project.id == project_id)
        .ok_or_else(|| format!("project not found: {project_id}"))?;
    branch_state.projects[project_index].name = trimmed_name.to_string();
    persist_locked_state(&state, &branch_state)?;

    Ok(ProjectSummary {
        id: branch_state.projects[project_index].id.clone(),
        name: branch_state.projects[project_index].name.clone(),
        squad_path: branch_state.projects[project_index].squad_path.clone(),
        repos: branch_state.projects[project_index].repos.clone(),
        sessions: branch_state
            .sessions_by_project
            .get(&branch_state.projects[project_index].id)
            .cloned()
            .unwrap_or_default(),
    })
}

#[tauri::command]
fn delete_project(project_id: String, state: State<'_, AppState>) -> Result<(), String> {
    let mut branch_state = state
        .branch_state
        .lock()
        .map_err(|_| "failed to lock backend state".to_string())?;
    normalize_branch_state(&mut branch_state);

    let initial_len = branch_state.projects.len();
    branch_state
        .projects
        .retain(|project| project.id != project_id);
    if branch_state.projects.len() == initial_len {
        return Err(format!("project not found: {project_id}"));
    }

    branch_state.sessions_by_project.remove(&project_id);

    persist_locked_state(&state, &branch_state)
}

#[tauri::command]
fn create_repo(
    project_id: String,
    name: String,
    local_path: String,
    state: State<'_, AppState>,
) -> Result<RepoSummary, String> {
    let trimmed_name = name.trim();
    if trimmed_name.is_empty() {
        return Err("repo name must not be empty".to_string());
    }

    let trimmed_path = local_path.trim();
    if trimmed_path.is_empty() {
        return Err("repo local path must not be empty".to_string());
    }
    validate_git_repo(trimmed_path)?;

    let mut branch_state = state
        .branch_state
        .lock()
        .map_err(|_| "failed to lock backend state".to_string())?;
    normalize_branch_state(&mut branch_state);

    if !branch_state
        .projects
        .iter()
        .any(|project| project.id == project_id)
    {
        return Err(format!("project not found: {project_id}"));
    }

    if branch_state.projects.iter().any(|project| {
        project
            .repos
            .iter()
            .any(|repo| repo.local_path == trimmed_path)
    }) {
        return Err("repository path is already connected".to_string());
    }

    let current_branch = git_current_branch(trimmed_path)?;
    let branches = git_local_branches(trimmed_path, &current_branch)?;
    let repo_id = next_repo_id(&mut branch_state);
    let repo = RepoSummary {
        id: repo_id.clone(),
        name: trimmed_name.to_string(),
        local_path: trimmed_path.to_string(),
        last_branch_read: current_branch.clone(),
    };

    {
        let target_project = branch_state
            .projects
            .iter_mut()
            .find(|project| project.id == project_id)
            .ok_or_else(|| format!("project not found: {project_id}"))?;
        target_project.repos.push(repo.clone());
    }
    branch_state
        .branches_by_repo
        .insert(repo_id.clone(), branches);
    branch_state
        .current_branch_by_repo
        .insert(repo_id, current_branch);
    persist_locked_state(&state, &branch_state)?;

    Ok(repo)
}

#[tauri::command]
fn rename_repo(
    project_id: String,
    repo_id: String,
    name: String,
    state: State<'_, AppState>,
) -> Result<RepoSummary, String> {
    let trimmed_name = name.trim();
    if trimmed_name.is_empty() {
        return Err("repo name must not be empty".to_string());
    }

    let mut branch_state = state
        .branch_state
        .lock()
        .map_err(|_| "failed to lock backend state".to_string())?;
    normalize_branch_state(&mut branch_state);

    let project = branch_state
        .projects
        .iter_mut()
        .find(|project| project.id == project_id)
        .ok_or_else(|| format!("project not found: {project_id}"))?;
    let repo_index = project
        .repos
        .iter()
        .position(|repo| repo.id == repo_id)
        .ok_or_else(|| format!("repo not found: {repo_id}"))?;
    project.repos[repo_index].name = trimmed_name.to_string();
    let renamed = project.repos[repo_index].clone();
    persist_locked_state(&state, &branch_state)?;
    Ok(renamed)
}

#[tauri::command]
fn delete_repo(
    project_id: String,
    repo_id: String,
    state: State<'_, AppState>,
) -> Result<(), String> {
    let mut branch_state = state
        .branch_state
        .lock()
        .map_err(|_| "failed to lock backend state".to_string())?;
    normalize_branch_state(&mut branch_state);

    let project = branch_state
        .projects
        .iter_mut()
        .find(|project| project.id == project_id)
        .ok_or_else(|| format!("project not found: {project_id}"))?;
    let initial_len = project.repos.len();
    project.repos.retain(|repo| repo.id != repo_id);
    if project.repos.len() == initial_len {
        return Err(format!("repo not found: {repo_id}"));
    }

    branch_state.branches_by_repo.remove(&repo_id);
    branch_state.current_branch_by_repo.remove(&repo_id);
    persist_locked_state(&state, &branch_state)
}

#[tauri::command]
fn reset_persisted_state(state: State<'_, AppState>) -> Result<(), String> {
    let mut branch_state = state
        .branch_state
        .lock()
        .map_err(|_| "failed to lock backend state".to_string())?;
    *branch_state = default_branch_state();
    persist_locked_state(&state, &branch_state)
}

#[tauri::command]
fn restore_state_from_backup(state: State<'_, AppState>) -> Result<(), String> {
    let backup_path = state.state_file_path.with_extension("json.bak");
    if !backup_path.exists() {
        return Err(format!(
            "backup state file not found: {}",
            backup_path.display()
        ));
    }

    let restored = load_branch_state(&backup_path)?;
    let mut branch_state = state
        .branch_state
        .lock()
        .map_err(|_| "failed to lock backend state".to_string())?;
    *branch_state = restored;
    persist_locked_state(&state, &branch_state)
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
    let state = state
        .branch_state
        .lock()
        .map_err(|_| "failed to lock backend state".to_string())?;

    Ok(state
        .sessions_by_project
        .get(&project_id)
        .cloned()
        .unwrap_or_default())
}

#[tauri::command]
fn list_branches(
    project_id: String,
    repo_id: String,
    state: State<'_, AppState>,
) -> Result<Vec<String>, String> {
    let mut branch_state = state
        .branch_state
        .lock()
        .map_err(|_| "failed to lock backend state".to_string())?;
    normalize_branch_state(&mut branch_state);

    let repo_path = branch_state
        .projects
        .iter()
        .find(|project| project.id == project_id)
        .and_then(|project| project.repos.iter().find(|repo| repo.id == repo_id))
        .map(|repo| repo.local_path.clone())
        .ok_or_else(|| format!("repo not found: {repo_id}"))?;

    let current_branch = git_current_branch(&repo_path)?;
    let branches = git_local_branches(&repo_path, &current_branch)?;
    branch_state
        .current_branch_by_repo
        .insert(repo_id.clone(), current_branch.clone());
    branch_state
        .branches_by_repo
        .insert(repo_id, branches.clone());
    persist_locked_state(&state, &branch_state)?;

    Ok(branches)
}

#[tauri::command]
fn get_current_branch(repo_id: String, state: State<'_, AppState>) -> Result<String, String> {
    let mut branch_state = state
        .branch_state
        .lock()
        .map_err(|_| "failed to lock backend state".to_string())?;
    normalize_branch_state(&mut branch_state);

    let repo_path = branch_state
        .projects
        .iter()
        .find_map(|project| {
            project
                .repos
                .iter()
                .find(|repo| repo.id == repo_id)
                .map(|repo| repo.local_path.clone())
        })
        .ok_or_else(|| format!("repo not found: {repo_id}"))?;

    let current_branch = git_current_branch(&repo_path)?;
    branch_state
        .current_branch_by_repo
        .insert(repo_id, current_branch.clone());
    persist_locked_state(&state, &branch_state)?;

    Ok(current_branch)
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
        let mut branch_state = state
            .branch_state
            .lock()
            .map_err(|_| "failed to lock backend state".to_string())?;
        normalize_branch_state(&mut branch_state);

        let repo_path = branch_state
            .projects
            .iter()
            .find_map(|project| {
                project
                    .repos
                    .iter()
                    .find(|repo| repo.id == repo_id)
                    .map(|repo| repo.local_path.clone())
            })
            .ok_or_else(|| format!("repo not found: {repo_id}"))?;

        let branches = git_local_branches(&repo_path, &git_current_branch(&repo_path)?)?;
        if !branches.iter().any(|candidate| candidate == &branch) {
            return Err(format!("unknown branch '{branch}' for repo '{repo_id}'"));
        }

        run_git(&repo_path, &["checkout", &branch])?;
        let current_branch = git_current_branch(&repo_path)?;
        let refreshed_branches = git_local_branches(&repo_path, &current_branch)?;

        if let Some(repo) = branch_state
            .projects
            .iter_mut()
            .flat_map(|project| project.repos.iter_mut())
            .find(|repo| repo.id == repo_id)
        {
            repo.last_branch_read = current_branch.clone();
        }

        branch_state
            .current_branch_by_repo
            .insert(repo_id.clone(), current_branch.clone());
        branch_state
            .branches_by_repo
            .insert(repo_id.clone(), refreshed_branches);
        persist_locked_state(&state, &branch_state)?;
        BranchChangedEvent {
            session_id,
            repo_id,
            branch: current_branch,
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
    project_id: Option<String>,
    repo_id: Option<String>,
    branch_map: Option<HashMap<String, String>>,
    state: State<'_, AppState>,
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

    let agents = vec!["copilot-cli".to_string()];
    let running_status = AgentStatusEvent {
        session_id: session_id.clone(),
        status: "running".to_string(),
        agents: agents.clone(),
        detail: None,
    };
    app.emit("agent_status", &running_status)
        .map_err(|e| format!("failed to emit agent_status: {e}"))?;

    let branch_hint = branch_map
        .as_ref()
        .map(|m| {
            m.iter()
                .map(|(repo, branch)| format!("{repo}:{branch}"))
                .collect::<Vec<_>>()
                .join(", ")
        })
        .unwrap_or_else(|| "no branch context".to_string());
    let mut branch_state = state
        .branch_state
        .lock()
        .map_err(|_| "failed to lock backend state".to_string())?;
    normalize_branch_state(&mut branch_state);
    let mut project_id_for_session = None;
    let mut session_exists = false;
    for (project_id, sessions) in branch_state.sessions_by_project.iter_mut() {
        if let Some(session) = sessions.iter_mut().find(|s| s.id == session_id) {
            session.updated_at = now_millis();
            session.excerpt = message.clone();
            project_id_for_session = Some(project_id.clone());
            session_exists = true;
            break;
        }
    }
    if project_id_for_session.is_none() {
        if let Some(explicit_project_id) = project_id.as_ref() {
            if branch_state
                .projects
                .iter()
                .any(|project| project.id == *explicit_project_id)
            {
                project_id_for_session = Some(explicit_project_id.clone());
            }
        }
    }
    if !session_exists {
        if let Some(project_id) = project_id_for_session.as_ref() {
            let sessions = branch_state
                .sessions_by_project
                .entry(project_id.clone())
                .or_default();
            if !sessions.iter().any(|session| session.id == session_id) {
                sessions.insert(
                    0,
                    SessionSummary {
                        id: session_id.clone(),
                        name: "New Session".to_string(),
                        role: role.clone(),
                        updated_at: now_millis(),
                        excerpt: message.clone(),
                    },
                );
            }
        }
    }
    let working_repo_path = project_id_for_session
        .as_ref()
        .and_then(|project_id| {
            branch_state
                .projects
                .iter()
                .find(|project| project.id == *project_id)
        })
        .and_then(|project| {
            resolve_chat_working_repo_path(
                project,
                repo_id.as_deref(),
                branch_map.as_ref(),
                &message,
            )
        });

    if working_repo_path.is_none() {
        let detail = if project_id_for_session.is_none() {
            "Copilot aborted: no project context resolved for this session. Select a project session and try again."
                .to_string()
        } else {
            "Copilot aborted: no repository target resolved for this project. Set a repo for this session and try again."
                .to_string()
        };
        let error_status = AgentStatusEvent {
            session_id,
            status: "error".to_string(),
            agents: vec!["copilot-cli".to_string()],
            detail: Some(detail.clone()),
        };
        app.emit("agent_status", &error_status)
            .map_err(|e| format!("failed to emit agent_status: {e}"))?;
        return Err(detail);
    }

    persist_locked_state(&state, &branch_state)?;
    drop(branch_state);

    let messages_path = if let Some(project_id) = project_id_for_session.as_ref() {
        Some(resolve_session_messages_path(
            &state,
            project_id,
            &session_id,
        )?)
    } else {
        None
    };
    if let Some(path) = messages_path.as_ref() {
        append_session_message(
            path,
            ChatMessageRecord {
                id: String::new(),
                role: "user".to_string(),
                content: message.clone(),
                timestamp: now_millis(),
                agents_meta: None,
            },
        )?;
    }

    let app_handle = app.clone();
    let session_id_for_worker = session_id.clone();
    let role_for_worker = role.clone();
    let messages_path_for_worker = messages_path.clone();
    let working_repo_path_for_worker = working_repo_path.clone();
    std::thread::spawn(move || {
        let repo_context = working_repo_path_for_worker
            .as_ref()
            .map(|path| format!("Working repository: {path}"))
            .unwrap_or_else(|| "Working repository: unresolved".to_string());
        let prompt = format!(
            "Role: {role_for_worker}\n{repo_context}\nBranch context: {branch_hint}\nUser request:\n{message}"
        );
        let mut command = Command::new("gh");
        command
            .args(["copilot", "-p", &prompt])
            .stdout(Stdio::piped())
            .stderr(Stdio::piped());
        if let Some(path) = working_repo_path_for_worker.as_ref() {
            command.current_dir(path);
        }
        let child_result = command.spawn();

        match child_result {
            Ok(mut child) => {
                let stdout = match child.stdout.take() {
                    Some(stdout) => stdout,
                    None => {
                        let failure_message =
                            "Copilot command failed: missing stdout pipe.".to_string();
                        let _ = app_handle.emit(
                            "response_chunk",
                            &ResponseChunkEvent {
                                session_id: session_id_for_worker.clone(),
                                chunk: format!("Copilot failed: {failure_message}"),
                            },
                        );
                        let persisted_failure = format!("Copilot failed: {failure_message}");
                        let _ = app_handle.emit(
                            "agent_status",
                            &AgentStatusEvent {
                                session_id: session_id_for_worker.clone(),
                                status: "error".to_string(),
                                agents: vec!["copilot-cli".to_string()],
                                detail: Some(failure_message),
                            },
                        );
                        let _ = app_handle.emit(
                            "response_done",
                            &ResponseDoneEvent {
                                session_id: session_id_for_worker.clone(),
                                agents_meta: AgentsMeta {
                                    agents: vec!["copilot-cli".to_string()],
                                    role: role_for_worker.clone(),
                                    mock: true,
                                },
                            },
                        );
                        let _ = app_handle.emit(
                            "agent_status",
                            &AgentStatusEvent {
                                session_id: session_id_for_worker,
                                status: "idle".to_string(),
                                agents: vec!["copilot-cli".to_string()],
                                detail: None,
                            },
                        );
                        if let Some(path) = messages_path_for_worker.as_ref() {
                            let _ = append_session_message(
                                path,
                                ChatMessageRecord {
                                    id: String::new(),
                                    role: "agent".to_string(),
                                    content: persisted_failure,
                                    timestamp: now_millis(),
                                    agents_meta: Some(ChatAgentsMetaRecord {
                                        agents: vec!["copilot-cli".to_string()],
                                        user_role: role_for_worker,
                                        tier: Some("mock".to_string()),
                                    }),
                                },
                            );
                        }
                        return;
                    }
                };

                let stderr = match child.stderr.take() {
                    Some(stderr) => stderr,
                    None => {
                        let failure_message =
                            "Copilot command failed: missing stderr pipe.".to_string();
                        let _ = app_handle.emit(
                            "response_chunk",
                            &ResponseChunkEvent {
                                session_id: session_id_for_worker.clone(),
                                chunk: format!("Copilot failed: {failure_message}"),
                            },
                        );
                        let persisted_failure = format!("Copilot failed: {failure_message}");
                        let _ = app_handle.emit(
                            "agent_status",
                            &AgentStatusEvent {
                                session_id: session_id_for_worker.clone(),
                                status: "error".to_string(),
                                agents: vec!["copilot-cli".to_string()],
                                detail: Some(failure_message),
                            },
                        );
                        let _ = app_handle.emit(
                            "response_done",
                            &ResponseDoneEvent {
                                session_id: session_id_for_worker.clone(),
                                agents_meta: AgentsMeta {
                                    agents: vec!["copilot-cli".to_string()],
                                    role: role_for_worker.clone(),
                                    mock: true,
                                },
                            },
                        );
                        let _ = app_handle.emit(
                            "agent_status",
                            &AgentStatusEvent {
                                session_id: session_id_for_worker,
                                status: "idle".to_string(),
                                agents: vec!["copilot-cli".to_string()],
                                detail: None,
                            },
                        );
                        if let Some(path) = messages_path_for_worker.as_ref() {
                            let _ = append_session_message(
                                path,
                                ChatMessageRecord {
                                    id: String::new(),
                                    role: "agent".to_string(),
                                    content: persisted_failure,
                                    timestamp: now_millis(),
                                    agents_meta: Some(ChatAgentsMetaRecord {
                                        agents: vec!["copilot-cli".to_string()],
                                        user_role: role_for_worker,
                                        tier: Some("mock".to_string()),
                                    }),
                                },
                            );
                        }
                        return;
                    }
                };

                let (tx, rx) = mpsc::channel::<StreamMessage>();
                let stdout_tx = tx.clone();
                std::thread::spawn(move || read_stream_lines(stdout, false, stdout_tx));
                let stderr_tx = tx.clone();
                std::thread::spawn(move || read_stream_lines(stderr, true, stderr_tx));
                drop(tx);

                let mut emitted_any_chunk = false;
                let mut response_chunks: Vec<String> = Vec::new();
                let mut stderr_lines: Vec<String> = Vec::new();
                let mut saw_trace_output = false;
                let mut stdout_done = false;
                let mut stderr_done = false;

                while !stdout_done || !stderr_done {
                    match rx.recv_timeout(Duration::from_millis(100)) {
                        Ok(StreamMessage::StdoutLine(raw_line)) => {
                            let line = normalize_output_line(&raw_line);
                            if line.is_empty()
                                || line.starts_with("Changes")
                                || line.starts_with("Requests")
                                || line.starts_with("Tokens")
                            {
                                continue;
                            }

                            if is_tool_trace_line(&line) {
                                saw_trace_output = true;
                                if let Some(detail) = trace_status_detail(&line) {
                                    let _ = app_handle.emit(
                                        "agent_status",
                                        &AgentStatusEvent {
                                            session_id: session_id_for_worker.clone(),
                                            status: "running".to_string(),
                                            agents: vec!["copilot-cli".to_string()],
                                            detail: Some(detail),
                                        },
                                    );
                                }
                                continue;
                            }

                            let chunk = format!("{line}\n");
                            let _ = app_handle.emit(
                                "response_chunk",
                                &ResponseChunkEvent {
                                    session_id: session_id_for_worker.clone(),
                                    chunk,
                                },
                            );
                            response_chunks.push(line);
                            emitted_any_chunk = true;
                        }
                        Ok(StreamMessage::StderrLine(raw_line)) => {
                            let line = normalize_output_line(&raw_line);
                            if line.is_empty() {
                                continue;
                            }

                            if is_tool_trace_line(&line) {
                                saw_trace_output = true;
                                if let Some(detail) = trace_status_detail(&line) {
                                    let _ = app_handle.emit(
                                        "agent_status",
                                        &AgentStatusEvent {
                                            session_id: session_id_for_worker.clone(),
                                            status: "running".to_string(),
                                            agents: vec!["copilot-cli".to_string()],
                                            detail: Some(detail),
                                        },
                                    );
                                }
                                continue;
                            }

                            stderr_lines.push(line);
                        }
                        Ok(StreamMessage::StdoutDone) => {
                            stdout_done = true;
                        }
                        Ok(StreamMessage::StderrDone) => {
                            stderr_done = true;
                        }
                        Err(RecvTimeoutError::Timeout) => {}
                        Err(RecvTimeoutError::Disconnected) => {
                            break;
                        }
                    }
                }

                match child.wait() {
                    Ok(status) if status.success() => {
                        if !emitted_any_chunk {
                            if let Some(fallback) = stderr_lines.first().cloned() {
                                let _ = app_handle.emit(
                                    "response_chunk",
                                    &ResponseChunkEvent {
                                        session_id: session_id_for_worker.clone(),
                                        chunk: fallback.clone(),
                                    },
                                );
                                response_chunks.push(fallback);
                            } else {
                                let no_answer = if saw_trace_output {
                                    "Copilot finished but returned no final answer."
                                } else {
                                    "Copilot returned no response."
                                };
                                let _ = app_handle.emit(
                                    "response_chunk",
                                    &ResponseChunkEvent {
                                        session_id: session_id_for_worker.clone(),
                                        chunk: no_answer.to_string(),
                                    },
                                );
                                response_chunks.push(no_answer.to_string());
                            }
                        }

                        let _ = app_handle.emit(
                            "response_done",
                            &ResponseDoneEvent {
                                session_id: session_id_for_worker.clone(),
                                agents_meta: AgentsMeta {
                                    agents: vec!["copilot-cli".to_string()],
                                    role: role_for_worker.clone(),
                                    mock: false,
                                },
                            },
                        );
                        let _ = app_handle.emit(
                            "agent_status",
                            &AgentStatusEvent {
                                session_id: session_id_for_worker.clone(),
                                status: "idle".to_string(),
                                agents: vec!["copilot-cli".to_string()],
                                detail: None,
                            },
                        );
                        let persisted_response = response_chunks.join("\n");
                        if let Some(path) = messages_path_for_worker.as_ref() {
                            let _ = append_session_message(
                                path,
                                ChatMessageRecord {
                                    id: String::new(),
                                    role: "agent".to_string(),
                                    content: persisted_response,
                                    timestamp: now_millis(),
                                    agents_meta: Some(ChatAgentsMetaRecord {
                                        agents: vec!["copilot-cli".to_string()],
                                        user_role: role_for_worker,
                                        tier: Some("direct".to_string()),
                                    }),
                                },
                            );
                        }
                    }
                    Ok(_) => {
                        let detail = stderr_lines
                            .first()
                            .cloned()
                            .or_else(|| response_chunks.last().cloned());
                        let failure_message =
                            detail.unwrap_or_else(|| "Copilot command failed.".to_string());
                        let _ = app_handle.emit(
                            "response_chunk",
                            &ResponseChunkEvent {
                                session_id: session_id_for_worker.clone(),
                                chunk: format!("Copilot failed: {failure_message}"),
                            },
                        );
                        let persisted_failure = format!("Copilot failed: {failure_message}");
                        let _ = app_handle.emit(
                            "agent_status",
                            &AgentStatusEvent {
                                session_id: session_id_for_worker.clone(),
                                status: "error".to_string(),
                                agents: vec!["copilot-cli".to_string()],
                                detail: Some(failure_message),
                            },
                        );
                        let _ = app_handle.emit(
                            "response_done",
                            &ResponseDoneEvent {
                                session_id: session_id_for_worker.clone(),
                                agents_meta: AgentsMeta {
                                    agents: vec!["copilot-cli".to_string()],
                                    role: role_for_worker.clone(),
                                    mock: true,
                                },
                            },
                        );
                        let _ = app_handle.emit(
                            "agent_status",
                            &AgentStatusEvent {
                                session_id: session_id_for_worker.clone(),
                                status: "idle".to_string(),
                                agents: vec!["copilot-cli".to_string()],
                                detail: None,
                            },
                        );
                        if let Some(path) = messages_path_for_worker.as_ref() {
                            let _ = append_session_message(
                                path,
                                ChatMessageRecord {
                                    id: String::new(),
                                    role: "agent".to_string(),
                                    content: persisted_failure,
                                    timestamp: now_millis(),
                                    agents_meta: Some(ChatAgentsMetaRecord {
                                        agents: vec!["copilot-cli".to_string()],
                                        user_role: role_for_worker,
                                        tier: Some("mock".to_string()),
                                    }),
                                },
                            );
                        }
                    }
                    Err(error) => {
                        let failure_message =
                            format!("failed to wait for Copilot command: {error}");
                        let _ = app_handle.emit(
                            "response_chunk",
                            &ResponseChunkEvent {
                                session_id: session_id_for_worker.clone(),
                                chunk: format!("Copilot failed: {failure_message}"),
                            },
                        );
                        let persisted_failure = format!("Copilot failed: {failure_message}");
                        let _ = app_handle.emit(
                            "agent_status",
                            &AgentStatusEvent {
                                session_id: session_id_for_worker.clone(),
                                status: "error".to_string(),
                                agents: vec!["copilot-cli".to_string()],
                                detail: Some(failure_message),
                            },
                        );
                        let _ = app_handle.emit(
                            "response_done",
                            &ResponseDoneEvent {
                                session_id: session_id_for_worker.clone(),
                                agents_meta: AgentsMeta {
                                    agents: vec!["copilot-cli".to_string()],
                                    role: role_for_worker.clone(),
                                    mock: true,
                                },
                            },
                        );
                        let _ = app_handle.emit(
                            "agent_status",
                            &AgentStatusEvent {
                                session_id: session_id_for_worker.clone(),
                                status: "idle".to_string(),
                                agents: vec!["copilot-cli".to_string()],
                                detail: None,
                            },
                        );
                        if let Some(path) = messages_path_for_worker.as_ref() {
                            let _ = append_session_message(
                                path,
                                ChatMessageRecord {
                                    id: String::new(),
                                    role: "agent".to_string(),
                                    content: persisted_failure,
                                    timestamp: now_millis(),
                                    agents_meta: Some(ChatAgentsMetaRecord {
                                        agents: vec!["copilot-cli".to_string()],
                                        user_role: role_for_worker,
                                        tier: Some("mock".to_string()),
                                    }),
                                },
                            );
                        }
                    }
                }
            }
            Err(error) => {
                let failure_message = format!("failed to run Copilot command: {error}");
                let _ = app_handle.emit(
                    "response_chunk",
                    &ResponseChunkEvent {
                        session_id: session_id_for_worker.clone(),
                        chunk: format!("Copilot failed: {failure_message}"),
                    },
                );
                let persisted_failure = format!("Copilot failed: {failure_message}");
                let _ = app_handle.emit(
                    "agent_status",
                    &AgentStatusEvent {
                        session_id: session_id_for_worker.clone(),
                        status: "error".to_string(),
                        agents: vec!["copilot-cli".to_string()],
                        detail: Some(failure_message),
                    },
                );
                let _ = app_handle.emit(
                    "response_done",
                    &ResponseDoneEvent {
                        session_id: session_id_for_worker.clone(),
                        agents_meta: AgentsMeta {
                            agents: vec!["copilot-cli".to_string()],
                            role: role_for_worker.clone(),
                            mock: true,
                        },
                    },
                );
                let _ = app_handle.emit(
                    "agent_status",
                    &AgentStatusEvent {
                        session_id: session_id_for_worker,
                        status: "idle".to_string(),
                        agents: vec!["copilot-cli".to_string()],
                        detail: None,
                    },
                );
                if let Some(path) = messages_path_for_worker.as_ref() {
                    let _ = append_session_message(
                        path,
                        ChatMessageRecord {
                            id: String::new(),
                            role: "agent".to_string(),
                            content: persisted_failure,
                            timestamp: now_millis(),
                            agents_meta: Some(ChatAgentsMetaRecord {
                                agents: vec!["copilot-cli".to_string()],
                                user_role: role_for_worker,
                                tier: Some("mock".to_string()),
                            }),
                        },
                    );
                }
            }
        }
    });

    Ok(())
}

#[tauri::command]
fn get_session_messages(
    session_id: String,
    state: State<'_, AppState>,
) -> Result<Vec<ChatMessageRecord>, String> {
    let branch_state = state
        .branch_state
        .lock()
        .map_err(|_| "failed to lock backend state".to_string())?;
    let project_id = find_project_id_for_session(&branch_state, &session_id)
        .ok_or_else(|| format!("session not found: {session_id}"))?;
    let messages_path = resolve_session_messages_path(&state, &project_id, &session_id)?;
    load_session_messages(&messages_path)
}

#[tauri::command]
fn create_session(
    project_id: String,
    role: Option<String>,
    name: Option<String>,
    state: State<'_, AppState>,
) -> Result<SessionSummary, String> {
    let mut branch_state = state
        .branch_state
        .lock()
        .map_err(|_| "failed to lock backend state".to_string())?;
    normalize_branch_state(&mut branch_state);

    if !branch_state
        .projects
        .iter()
        .any(|project| project.id == project_id)
    {
        return Err(format!("project not found: {project_id}"));
    }

    let timestamp = now_millis();
    let new_session = SessionSummary {
        id: next_session_id(&mut branch_state),
        name: name.unwrap_or_else(|| "New Session".to_string()),
        role: role.unwrap_or_else(|| "Developer".to_string()),
        updated_at: timestamp,
        excerpt: "Session created".to_string(),
    };

    let sessions = branch_state
        .sessions_by_project
        .entry(project_id.clone())
        .or_default();
    sessions.insert(0, new_session.clone());
    let messages_path = resolve_session_messages_path(&state, &project_id, &new_session.id)?;
    if !messages_path.exists() {
        persist_session_messages(&messages_path, &Vec::<ChatMessageRecord>::new())?;
    }
    persist_locked_state(&state, &branch_state)?;

    Ok(new_session)
}

fn resolve_state_file_path(app: &AppHandle) -> Result<PathBuf, String> {
    let mut data_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("failed to resolve app data directory: {e}"))?;
    data_dir.push("agent42");
    fs::create_dir_all(&data_dir).map_err(|e| {
        format!(
            "failed to create app data directory '{}': {e}",
            data_dir.display()
        )
    })?;
    Ok(data_dir.join("state.json"))
}

fn load_branch_state(path: &Path) -> Result<BranchState, String> {
    if !path.exists() {
        return Ok(default_branch_state());
    }

    let content = fs::read_to_string(path)
        .map_err(|e| format!("failed to read persisted state '{}': {e}", path.display()))?;

    if let Ok(persisted) = serde_json::from_str::<PersistedState>(&content) {
        return match migrate_branch_state(persisted.schema_version, persisted.branch_state) {
            Ok(state) => Ok(state),
            Err(_) => {
                quarantine_corrupt_state_file(path)?;
                Ok(default_branch_state())
            }
        };
    }

    if let Ok(mut legacy_state) = serde_json::from_str::<BranchState>(&content) {
        normalize_branch_state(&mut legacy_state);
        return Ok(legacy_state);
    }

    quarantine_corrupt_state_file(path)?;
    Ok(default_branch_state())
}

fn persist_locked_state(app_state: &AppState, state: &BranchState) -> Result<(), String> {
    let serialized = serde_json::to_string_pretty(&PersistedState {
        schema_version: STATE_SCHEMA_VERSION,
        branch_state: state.clone(),
    })
    .map_err(|e| format!("failed to serialize backend state: {e}"))?;

    let tmp_path = app_state.state_file_path.with_extension("json.tmp");
    fs::write(&tmp_path, serialized).map_err(|e| {
        format!(
            "failed to persist backend state to temp file '{}': {e}",
            tmp_path.display()
        )
    })?;

    if app_state.state_file_path.exists() {
        let backup_path = app_state.state_file_path.with_extension("json.bak");
        let _ = fs::copy(&app_state.state_file_path, backup_path);
    }

    fs::rename(&tmp_path, &app_state.state_file_path).map_err(|e| {
        format!(
            "failed to replace backend state '{}': {e}",
            app_state.state_file_path.display()
        )
    })
}

fn normalize_branch_state(state: &mut BranchState) {
    state.next_project_seq = state
        .next_project_seq
        .max(next_project_sequence_floor(state));
    state.next_repo_seq = state.next_repo_seq.max(next_repo_sequence_floor(state));
    state.next_session_seq = state
        .next_session_seq
        .max(next_session_sequence_floor(state));

    let project_ids: Vec<String> = state
        .projects
        .iter()
        .map(|project| project.id.clone())
        .collect();
    for project_id in project_ids {
        state.sessions_by_project.entry(project_id).or_default();
    }
}

fn default_branch_state() -> BranchState {
    let mut state = BranchState::default();
    normalize_branch_state(&mut state);
    state
}

fn migrate_branch_state(
    schema_version: u32,
    mut state: BranchState,
) -> Result<BranchState, String> {
    if schema_version > STATE_SCHEMA_VERSION {
        return Err(format!(
            "unsupported state schema version {schema_version}; this app supports up to {STATE_SCHEMA_VERSION}"
        ));
    }

    normalize_branch_state(&mut state);
    Ok(state)
}

fn quarantine_corrupt_state_file(path: &Path) -> Result<(), String> {
    let mut quarantine_path = path.to_path_buf();
    quarantine_path.set_file_name(format!("state.corrupt-{}.json", now_millis().max(0)));
    fs::rename(path, &quarantine_path).map_err(|e| {
        format!(
            "state file is corrupted and could not be quarantined '{}': {e}",
            path.display()
        )
    })
}

fn sync_project_squad_paths(app_state: &AppState, state: &mut BranchState) -> Result<bool, String> {
    let mut changed = false;

    for project in state.projects.iter_mut() {
        let squad_path = ensure_project_squad_bootstrap(app_state, &project.id, &project.name)?;
        if project.squad_path != squad_path {
            project.squad_path = squad_path;
            changed = true;
        }
    }

    Ok(changed)
}

fn ensure_project_squad_bootstrap(
    app_state: &AppState,
    project_id: &str,
    project_name: &str,
) -> Result<String, String> {
    let project_root = resolve_project_data_dir(app_state, project_id)?;
    fs::create_dir_all(&project_root).map_err(|e| {
        format!(
            "failed to create project data directory '{}': {e}",
            project_root.display()
        )
    })?;

    let squad_root = project_root.join(".squad");
    fs::create_dir_all(&squad_root).map_err(|e| {
        format!(
            "failed to create squad directory '{}': {e}",
            squad_root.display()
        )
    })?;

    for nested in ["agents", "skills", "log"] {
        let path = squad_root.join(nested);
        fs::create_dir_all(&path)
            .map_err(|e| format!("failed to create squad directory '{}': {e}", path.display()))?;
    }

    let config_path = project_root.join("squad.config.ts");
    if !config_path.exists() {
        fs::write(&config_path, render_squad_config(project_name)).map_err(|e| {
            format!(
                "failed to write squad config '{}': {e}",
                config_path.display()
            )
        })?;
    }

    ensure_default_mermaid_skill(&squad_root)?;

    Ok(squad_root.to_string_lossy().to_string())
}

fn ensure_default_mermaid_skill(squad_root: &Path) -> Result<(), String> {
    let mermaid_skill_dir = squad_root.join("skills").join("mermaid-diagrams");
    fs::create_dir_all(&mermaid_skill_dir).map_err(|e| {
        format!(
            "failed to create Mermaid skill directory '{}': {e}",
            mermaid_skill_dir.display()
        )
    })?;

    let skill_path = mermaid_skill_dir.join("SKILL.md");
    if !skill_path.exists() {
        fs::write(&skill_path, DEFAULT_MERMAID_SKILL).map_err(|e| {
            format!(
                "failed to write Mermaid skill file '{}': {e}",
                skill_path.display()
            )
        })?;
    }

    Ok(())
}

fn resolve_project_data_dir(app_state: &AppState, project_id: &str) -> Result<PathBuf, String> {
    let app_data_root = app_state
        .state_file_path
        .parent()
        .ok_or_else(|| "failed to resolve app data root for project storage".to_string())?;
    Ok(app_data_root.join("projects").join(project_id))
}

fn resolve_session_messages_path(
    app_state: &AppState,
    project_id: &str,
    session_id: &str,
) -> Result<PathBuf, String> {
    let project_root = resolve_project_data_dir(app_state, project_id)?;
    let sessions_dir = project_root.join("sessions").join(session_id);
    fs::create_dir_all(&sessions_dir).map_err(|e| {
        format!(
            "failed to create session data directory '{}': {e}",
            sessions_dir.display()
        )
    })?;
    Ok(sessions_dir.join("messages.json"))
}

fn load_session_messages(path: &Path) -> Result<Vec<ChatMessageRecord>, String> {
    if !path.exists() {
        return Ok(Vec::new());
    }

    let content = fs::read_to_string(path)
        .map_err(|e| format!("failed to read session messages '{}': {e}", path.display()))?;
    serde_json::from_str::<Vec<ChatMessageRecord>>(&content)
        .map_err(|e| format!("failed to parse session messages '{}': {e}", path.display()))
}

fn persist_session_messages(path: &Path, messages: &[ChatMessageRecord]) -> Result<(), String> {
    let serialized = serde_json::to_string_pretty(messages)
        .map_err(|e| format!("failed to serialize session messages: {e}"))?;
    let tmp_path = path.with_extension("json.tmp");
    fs::write(&tmp_path, serialized).map_err(|e| {
        format!(
            "failed to persist session messages to temp file '{}': {e}",
            tmp_path.display()
        )
    })?;
    fs::rename(&tmp_path, path).map_err(|e| {
        format!(
            "failed to replace session messages '{}': {e}",
            path.display()
        )
    })
}

fn append_session_message(path: &Path, mut message: ChatMessageRecord) -> Result<(), String> {
    let mut messages = load_session_messages(path)?;
    if message.id.is_empty() {
        message.id = format!("m{}-{}", now_millis().max(0), messages.len() + 1);
    }
    messages.push(message);
    persist_session_messages(path, &messages)
}

fn find_project_id_for_session(state: &BranchState, session_id: &str) -> Option<String> {
    state
        .sessions_by_project
        .iter()
        .find_map(|(project_id, sessions)| {
            if sessions.iter().any(|session| session.id == session_id) {
                Some(project_id.clone())
            } else {
                None
            }
        })
}

fn resolve_chat_working_repo_path(
    project: &ProjectRecord,
    preferred_repo_id: Option<&str>,
    branch_map: Option<&HashMap<String, String>>,
    message: &str,
) -> Option<String> {
    if let Some(repo_id) = preferred_repo_id {
        if let Some(repo) = project.repos.iter().find(|repo| repo.id == repo_id) {
            return Some(repo.local_path.clone());
        }
    }

    let normalized_message = message.trim().to_lowercase();

    if !normalized_message.is_empty() {
        if let Some(repo) = project.repos.iter().find(|repo| {
            let normalized_name = repo.name.trim().to_lowercase();
            !normalized_name.is_empty() && normalized_message.contains(&normalized_name)
        }) {
            return Some(repo.local_path.clone());
        }
    }

    if let Some(map) = branch_map {
        let matching_repos: Vec<&RepoSummary> = project
            .repos
            .iter()
            .filter(|repo| map.contains_key(&repo.id))
            .collect();
        if matching_repos.len() == 1 {
            return Some(matching_repos[0].local_path.clone());
        }
    }

    project.repos.first().map(|repo| repo.local_path.clone())
}

fn render_squad_config(project_name: &str) -> String {
    let escaped_name = escape_typescript_string(project_name);
    format!(
        "import {{ defineSquad, defineTeam, defineAgent, defineRouting }} from '@bradygaster/squad-sdk';\n\nexport default defineSquad({{\n  team: defineTeam({{\n    name: 'Agent 42 Team',\n    projectContext: '{escaped_name} multi-repo analysis',\n  }}),\n  agents: [\n    defineAgent({{ name: 'architect', role: 'System architecture, boundaries, ADRs, cross-repo dependencies' }}),\n    defineAgent({{ name: 'analyst', role: 'Domain logic, feature intent, requirements traceability' }}),\n    defineAgent({{ name: 'developer', role: 'Implementation details, code patterns, refactoring' }}),\n    defineAgent({{ name: 'devops', role: 'Pipelines, infrastructure-as-code, deployment topology' }}),\n    defineAgent({{ name: 'qa-lead', role: 'Quality coverage, risk areas, testing strategy' }}),\n    defineAgent({{ name: 'tester', role: 'Test cases, bug reproduction, edge cases' }}),\n    defineAgent({{ name: 'automation', role: 'Test automation frameworks, gaps, flaky test analysis' }}),\n    defineAgent({{ name: 'db-expert', role: 'Schema design, query performance, migration risks' }}),\n    defineAgent({{ name: 'security', role: 'Vulnerabilities, auth patterns, secrets hygiene' }}),\n    defineAgent({{ name: 'tech-writer', role: 'Documentation gaps, API contracts, onboarding clarity' }}),\n  ],\n  routing: defineRouting({{ fallback: 'coordinator' }}),\n  models: {{\n    default: 'claude-sonnet-4',\n    fallbackChains: {{\n      premium: ['claude-opus-4', 'gpt-4.1'],\n      standard: ['claude-sonnet-4', 'gpt-4.1'],\n      fast: ['claude-haiku-4.5', 'gpt-4.1-mini'],\n    }},\n  }},\n}});\n"
    )
}

fn escape_typescript_string(value: &str) -> String {
    value.replace('\\', "\\\\").replace('\'', "\\'")
}

fn next_project_sequence_floor(state: &BranchState) -> u64 {
    state
        .projects
        .iter()
        .filter_map(|project| parse_sequence(&project.id, "p"))
        .max()
        .unwrap_or(0)
        + 1
}

fn next_repo_sequence_floor(state: &BranchState) -> u64 {
    state
        .projects
        .iter()
        .flat_map(|project| project.repos.iter())
        .filter_map(|repo| parse_sequence(&repo.id, "repo-custom-"))
        .max()
        .unwrap_or(0)
        + 1
}

fn next_session_sequence_floor(state: &BranchState) -> u64 {
    state
        .sessions_by_project
        .values()
        .flat_map(|sessions| sessions.iter())
        .filter_map(|session| parse_sequence(&session.id, "s"))
        .max()
        .unwrap_or(0)
        + 1
}

fn parse_sequence(value: &str, prefix: &str) -> Option<u64> {
    value.strip_prefix(prefix)?.parse::<u64>().ok()
}

fn next_project_id(state: &mut BranchState) -> String {
    loop {
        let candidate = format!("p{}", state.next_project_seq.max(1));
        state.next_project_seq = state.next_project_seq.max(1) + 1;
        if !state.projects.iter().any(|project| project.id == candidate) {
            return candidate;
        }
    }
}

fn next_session_id(state: &mut BranchState) -> String {
    loop {
        let candidate = format!("s{}", state.next_session_seq.max(1));
        state.next_session_seq = state.next_session_seq.max(1) + 1;
        let exists = state
            .sessions_by_project
            .values()
            .any(|sessions| sessions.iter().any(|session| session.id == candidate));
        if !exists {
            return candidate;
        }
    }
}

fn next_repo_id(state: &mut BranchState) -> String {
    loop {
        let candidate = format!("repo-custom-{}", state.next_repo_seq.max(1));
        state.next_repo_seq = state.next_repo_seq.max(1) + 1;
        let exists = state
            .projects
            .iter()
            .any(|project| project.repos.iter().any(|repo| repo.id == candidate));
        if !exists {
            return candidate;
        }
    }
}

fn now_millis() -> i64 {
    match SystemTime::now().duration_since(UNIX_EPOCH) {
        Ok(duration) => duration.as_millis() as i64,
        Err(_) => 0,
    }
}

fn has_github_auth() -> bool {
    let status = Command::new("gh")
        .args(["auth", "status", "--hostname", "github.com"])
        .stdout(Stdio::null())
        .stderr(Stdio::null())
        .status();

    matches!(status, Ok(exit) if exit.success())
}

fn validate_git_repo(path: &str) -> Result<(), String> {
    let selected = Path::new(path);
    if !selected.is_dir() {
        return Err(format!("path is not a directory: {path}"));
    }

    let output = Command::new("git")
        .args(["-C", path, "rev-parse", "--is-inside-work-tree"])
        .output()
        .map_err(|e| format!("failed to validate git repo at '{path}': {e}"))?;

    if !output.status.success() {
        let detail = String::from_utf8_lossy(&output.stderr).trim().to_string();
        return Err(if detail.is_empty() {
            format!("path is not a git repository: {path}")
        } else {
            format!("path is not a git repository: {path} ({detail})")
        });
    }

    let inside = String::from_utf8_lossy(&output.stdout).trim().to_string();
    if inside != "true" {
        return Err(format!("path is not a git repository: {path}"));
    }

    let top_level = run_git(path, &["rev-parse", "--show-toplevel"])?;
    let selected_canonical = selected
        .canonicalize()
        .map_err(|e| format!("failed to resolve selected path '{path}': {e}"))?;
    let top_level_canonical = Path::new(&top_level)
        .canonicalize()
        .map_err(|e| format!("failed to resolve repository root '{top_level}': {e}"))?;
    if selected_canonical != top_level_canonical {
        return Err(format!(
            "path must be repository root. Selected '{path}', root is '{}'",
            top_level_canonical.display()
        ));
    }

    Ok(())
}

fn run_git(path: &str, args: &[&str]) -> Result<String, String> {
    let output = Command::new("git")
        .arg("-C")
        .arg(path)
        .args(args)
        .output()
        .map_err(|e| format!("failed to run git in '{path}': {e}"))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr).trim().to_string();
        let stdout = String::from_utf8_lossy(&output.stdout).trim().to_string();
        let detail = if !stderr.is_empty() { stderr } else { stdout };
        return Err(if detail.is_empty() {
            format!("git command failed in '{path}'")
        } else {
            detail
        });
    }

    Ok(String::from_utf8_lossy(&output.stdout).trim().to_string())
}

enum StreamMessage {
    StdoutLine(String),
    StderrLine(String),
    StdoutDone,
    StderrDone,
}

fn read_stream_lines<R: Read>(reader: R, is_stderr: bool, tx: mpsc::Sender<StreamMessage>) {
    let buffered = BufReader::new(reader);
    for line in buffered.lines() {
        let Ok(line) = line else {
            break;
        };
        let message = if is_stderr {
            StreamMessage::StderrLine(line)
        } else {
            StreamMessage::StdoutLine(line)
        };
        if tx.send(message).is_err() {
            return;
        }
    }

    let _ = tx.send(if is_stderr {
        StreamMessage::StderrDone
    } else {
        StreamMessage::StdoutDone
    });
}

fn is_tool_trace_line(line: &str) -> bool {
    let trimmed = line.trim();
    let lowered = trimmed.to_ascii_lowercase();
    let looks_like_thinking_preamble = (trimmed.starts_with("I’ll ")
        || trimmed.starts_with("I'll "))
        && (lowered.contains("scan")
            || lowered.contains("search")
            || lowered.contains("inspect")
            || lowered.contains("examin")
            || lowered.contains("checking")
            || lowered.contains("look up"));
    trimmed.starts_with('●')
        || trimmed.starts_with('✗')
        || trimmed.starts_with('✔')
        || trimmed.starts_with('│')
        || trimmed.starts_with('└')
        || trimmed.contains("(MCP:")
        || trimmed.starts_with("Search (")
        || trimmed.starts_with("Fetching web content")
        || trimmed.starts_with("Get file or directory contents")
        || trimmed.starts_with("Get GitHub language stats")
        || looks_like_thinking_preamble
        || trimmed.contains("Permission denied and could not request permission from user")
}

fn trace_status_detail(line: &str) -> Option<String> {
    let mut detail = line.trim().to_string();
    if detail.is_empty() {
        return None;
    }

    if detail.starts_with('●')
        || detail.starts_with('✗')
        || detail.starts_with('✔')
        || detail.starts_with('│')
        || detail.starts_with('└')
    {
        detail = detail
            .chars()
            .skip(1)
            .collect::<String>()
            .trim()
            .to_string();
    }

    if detail.is_empty() {
        return None;
    }

    if detail.len() > 180 {
        detail.truncate(177);
        detail.push_str("...");
    }

    Some(detail)
}

fn normalize_output_line(line: &str) -> String {
    strip_ansi_escape_sequences(line)
        .trim_matches(|c: char| c.is_control())
        .trim()
        .to_string()
}

fn strip_ansi_escape_sequences(input: &str) -> String {
    let mut output = String::with_capacity(input.len());
    let mut chars = input.chars().peekable();

    while let Some(ch) = chars.next() {
        if ch == '\u{1b}' {
            if let Some('[') = chars.peek() {
                let _ = chars.next();
                for esc in chars.by_ref() {
                    if ('@'..='~').contains(&esc) {
                        break;
                    }
                }
                continue;
            }
        }
        output.push(ch);
    }

    output
}

fn git_current_branch(path: &str) -> Result<String, String> {
    let symbolic = run_git(path, &["symbolic-ref", "--quiet", "--short", "HEAD"]);
    if let Ok(branch) = symbolic {
        if !branch.is_empty() {
            return Ok(branch);
        }
    }

    let fallback = run_git(path, &["rev-parse", "--abbrev-ref", "HEAD"])?;
    if fallback.is_empty() {
        return Err(format!("unable to determine current branch for '{path}'"));
    }

    Ok(fallback)
}

fn git_local_branches(path: &str, current_branch: &str) -> Result<Vec<String>, String> {
    let output = run_git(
        path,
        &["for-each-ref", "--format=%(refname:short)", "refs/heads"],
    )?;
    let mut branches: Vec<String> = output
        .lines()
        .map(str::trim)
        .filter(|line| !line.is_empty())
        .map(ToOwned::to_owned)
        .collect();

    if !current_branch.is_empty() && !branches.iter().any(|branch| branch == current_branch) {
        branches.push(current_branch.to_string());
    }

    Ok(branches)
}

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .setup(|app| {
            let app_handle = app.handle().clone();
            let state_file_path = resolve_state_file_path(&app_handle)?;
            let branch_state = load_branch_state(&state_file_path)?;
            app.manage(AppState {
                branch_state: Mutex::new(branch_state),
                state_file_path,
            });
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            get_auth_status,
            sign_in_with_github_copilot,
            get_project_list,
            create_project,
            rename_project,
            delete_project,
            create_repo,
            rename_repo,
            delete_repo,
            reset_persisted_state,
            restore_state_from_backup,
            open_chat_window,
            get_session_list,
            get_session_messages,
            list_branches,
            get_current_branch,
            checkout_branch,
            send_message,
            create_session
        ])
        .run(tauri::generate_context!())
        .expect("error while running Agent 42");
}
