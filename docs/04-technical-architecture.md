# 04 — Technical Architecture

## System Overview

Agent 42 is a Tauri desktop application. It consists of three runtime components:

1. **Tauri shell** — the native window manager and OS integration layer (Rust)
2. **React frontend** — the UI rendered in the Tauri webview (TypeScript)
3. **Node.js sidecar** — a background process running the Squad SDK and handling all agent orchestration (TypeScript/Node)

The three components run entirely on the user's machine. There is no remote server owned by Agent 42. The only external network call is to the GitHub Copilot API for LLM inference, using the user's own authenticated Copilot account.

```
┌─────────────────────────────────────────────────────┐
│                  User's Machine                     │
│                                                     │
│  ┌──────────────┐     IPC      ┌─────────────────┐  │
│  │  React UI    │◄────────────►│  Tauri Shell    │  │
│  │ (webview)    │              │  (Rust)         │  │
│  └──────────────┘              └────────┬────────┘  │
│                                         │           │
│                                  Sidecar spawn      │
│                                         │           │
│                                ┌────────▼────────┐  │
│                                │  Node.js        │  │
│                                │  Sidecar        │  │
│                                │  (Squad SDK)    │  │
│                                └────────┬────────┘  │
│                                         │           │
│                         ┌───────────────┤           │
│                          │              │           │
│         ┌────────────────▼──┐  ┌────────▼────────┐  │
│         │  User's local     │  │  .squad/ state  │  │
│         │  repo folders     │  │  per project    │  │
│         │  + worktrees      │  │                 │  │
│         └───────────────────┘  └─────────────────┘  │
└─────────────────────────────────────────────────────┘
                                          │
                                          ▼
                                 GitHub Copilot API
                                 (LLM inference only)
```

---

## Component 1 — Tauri Shell (Rust)

Responsibilities:
- Native window creation and management (one window per chat session)
- Spawning and managing the Node.js sidecar process lifecycle
- Bidirectional IPC between the React frontend and the sidecar
- OS keychain integration for storing the Copilot auth token securely
- Native folder picker dialog for adding local repos to a project
- Git operations via the `git2` Rust crate: reading current HEAD, listing local branches, creating and pruning worktrees, checking out branches
- App-level settings persistence (SQLite via `rusqlite`)

Tauri commands exposed to the frontend (selection):

```
create_project(name)
add_repo(project_id, local_path)       ← validates .git folder exists
remove_repo(project_id, repo_id)
list_branches(project_id, repo_id)     ← reads from local clone
get_current_branch(repo_id)            ← reads HEAD from .git
checkout_branch(session_id, repo_id, branch)
get_project_list()
get_session_list(project_id)
open_chat_window(project_id, session_id?)
send_message(session_id, message, role)  → streams response via event
```

---

## Component 2 — React Frontend (TypeScript)

Responsibilities:
- All UI rendering (screens described in doc 02)
- Calling Tauri commands via `@tauri-apps/api/core`
- Listening for Tauri events for streaming responses and status updates
- Local UI state management (Zustand)
- No direct network calls — all external communication goes through the Tauri shell or sidecar

Key state slices:
- `auth` — Copilot connection status
- `projects` — list of projects with repo and session metadata
- `sessions` — per-window session state: messages, active role, branch map
- `knowledge` — cached view of `.squad/` content for the knowledge panel

---

## Component 3 — Node.js Sidecar (TypeScript)

The sidecar is a long-running Node.js process spawned by Tauri on app start. It communicates with the Tauri shell via stdin/stdout IPC using a simple JSON message protocol.

Responsibilities:
- All Squad SDK orchestration: `SquadCoordinator`, `SquadClientWithPool`, session management
- Receiving prompts from the Tauri shell and routing them through the coordinator
- Streaming response chunks back to Tauri as they arrive from Copilot
- Writing agent learnings and decisions back to the project `.squad/` folder
- Maintaining per-session coordinator instances (one per open chat window)
- Reading `.squad/` content for the knowledge panel on demand

IPC message types (JSON over stdin/stdout):

```typescript
// Tauri → Sidecar
{ type: 'init_session', sessionId, projectPath, role }
{ type: 'send_message', sessionId, message, role, branchMap }
{ type: 'close_session', sessionId }
{ type: 'get_knowledge', projectPath }
{ type: 'get_decisions', projectPath }

// Sidecar → Tauri
{ type: 'response_chunk', sessionId, chunk }
{ type: 'response_done', sessionId, agentsMeta }
{ type: 'agent_status', sessionId, agents: string[] }
{ type: 'knowledge_data', entries: KnowledgeEntry[] }
{ type: 'error', sessionId, message }
```

---

## Data Flow — Chat Message

```
User types message → Send

React UI
  → invoke('send_message', { sessionId, message, role, branchMap })

Tauri Shell
  → writes JSON to sidecar stdin:
    { type: 'send_message', sessionId, message, role, branchMap }

Node.js Sidecar
  → coordinator.route(message, { role, branchMap })
  → coordinator.execute(decision, message)
  → agents run (parallel where applicable)
  → response chunks streamed back:
    { type: 'response_chunk', sessionId, chunk }
  → on completion:
    { type: 'response_done', sessionId, agentsMeta }

Tauri Shell
  → emits Tauri event to the correct frontend window:
    'response_chunk' → React appends to streaming message
    'response_done'  → React finalises message, shows agent metadata

React UI
  → message renders fully in chat view
```

---

## Data Flow — Branch Switch (Dropdown)

```
User selects branch in dropdown

React UI
  → invoke('checkout_branch', { sessionId, repoId, branch })

Tauri Shell (Rust)
  → git2: checkout branch in session worktree for this repo
  → emits 'branch_changed' event to frontend window

React UI
  → updates branch selector to new branch
  → updates status summary line in input area

Node.js Sidecar
  → notified via IPC: { type: 'branch_changed', sessionId, repoId, branch }
  → updates branchMap in session context for next coordinator call
```

---

## Data Flow — Repo Added to Project

```
User clicks "Add Repository" → native folder picker opens
User selects a local folder

Tauri Shell (Rust)
  → validates folder contains a .git directory
  → reads current branch via git2 (HEAD)
  → inserts repo record into app.db with local_path
  → emits 'repo_added' event to frontend

React UI
  → repo appears in project overview and branch selectors
  → no cloning, no network call
```

---

## Storage Layout

```
~/Library/Application Support/Agent42/     (macOS)
%APPDATA%\Agent42\                         (Windows)
  app.db                  ← SQLite: auth state, project list, repo list, sessions
  projects/
    {project-id}/
      project.json        ← project metadata (name, created date)
      sessions/
        {session-id}/
          messages.json   ← full conversation history for this session
      .squad/             ← Squad state: team.md, decisions.md, agents/*, log/
      worktrees/
        {session-id}/
          {repo-id}/      ← git worktree for this session's active branch
                             (only created when user switches from default branch)
```

Note: repos are **not** stored inside the app data directory. The app stores only the local path to the user's existing clone. Worktrees are created adjacent to (but separate from) the user's working copy via `git worktree add`.

---

## External Dependencies

| Service | Purpose | Auth method |
|---|---|---|
| GitHub Copilot API | LLM inference for all agent responses | OAuth via `gh auth login`; token read from `gh` credential store |

No GitHub API. No GitLab API. No webhooks. No remote cloning.

---

## Security Considerations

- The Copilot auth token is stored exclusively in the OS keychain (macOS Keychain, Windows Credential Manager). It is never written to disk in plaintext.
- The sidecar receives the token from the Tauri shell at startup via an environment variable injected into the spawned process — not via IPC messages.
- The app never reads or transmits files outside of the repo paths the user explicitly added to a project.
- No telemetry or analytics. No data is sent to any Agent 42 server — there is no Agent 42 server.
