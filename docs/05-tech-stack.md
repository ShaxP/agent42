# 05 — Tech Stack

## Overview

| Layer | Technology | Rationale |
|---|---|---|
| Desktop shell | Tauri 2 (Rust) | Native performance, small binary, OS keychain access, cross-platform |
| UI framework | React 19 + TypeScript | Familiar, strong ecosystem, excellent streaming UI patterns |
| UI styling | Tailwind CSS | Utility-first, fast iteration, consistent design tokens |
| UI state | Zustand | Lightweight, minimal boilerplate, works well with Tauri event model |
| Agent orchestration | Node.js sidecar + @bradygaster/squad-sdk | Squad SDK requires Node; sidecar isolates it cleanly from Rust shell |
| Git operations | git2 (Rust crate) | Native libgit2 bindings; used for worktree, branch ops, HEAD reading |
| App database | SQLite via rusqlite | Lightweight, no server, stores project list, session metadata, settings |
| OS keychain | tauri-plugin-stronghold or keyring crate | Secure Copilot token storage; never writes credentials to disk |
| Sidecar IPC | JSON over stdin/stdout | Simple, reliable, no extra dependencies, works across platforms |

---

## Tauri 2

Tauri is the desktop shell. It manages native windows, spawns the Node.js sidecar, handles file system access, and exposes Rust functions to the React frontend via the `invoke` API.

Tauri 2 is chosen over Electron because:
- The binary is dramatically smaller (no bundled Chromium)
- Memory usage is lower (uses the OS webview: WebKit on macOS, WebView2 on Windows)
- Direct access to Rust for git operations, OS keychain, and file system
- Better security model — the webview has explicit, auditable access to Rust capabilities

Key Tauri plugins used:
- `tauri-plugin-shell` — spawn and communicate with the Node.js sidecar
- `tauri-plugin-store` — app-level persistent settings
- `tauri-plugin-dialog` — native folder picker for adding local repos
- OS keychain plugin (stronghold or native keyring) — Copilot credential storage

---

## React + TypeScript

The entire UI is a React 19 application rendered inside Tauri's webview. TypeScript is used throughout.

Key libraries:
- `@tauri-apps/api` — Tauri command invocation and event listening
- `zustand` — global UI state (auth, projects, sessions, knowledge panel)
- `react-markdown` + `react-syntax-highlighter` — rendering agent responses with code highlighting
- `@radix-ui` primitives — accessible dropdowns, modals, popovers
- `tailwindcss` — styling

No React framework (no Next.js, no Remix) — this is a pure client-side app with no SSR requirement.

---

## Node.js Sidecar

The sidecar is a compiled Node.js application (bundled with `esbuild` into a single executable using `pkg` or `caxa`) that Tauri spawns as a child process.

It uses:
- `@bradygaster/squad-sdk` — Squad coordinator, session pool, agent orchestration, tool registry
- `@github/copilot-sdk` (via Squad SDK) — Copilot API access
- Node.js `readline` — reading JSON messages from Tauri via stdin
- Node.js `process.stdout` — writing JSON response chunks back to Tauri

The sidecar is bundled as a platform-specific binary and included in the Tauri app bundle. It starts when the app starts and shuts down when the app closes.

---

## Git Operations (git2 Rust crate)

All git operations are performed in Rust using the `git2` crate (libgit2 bindings). The app does not clone or fetch from remotes — it reads only from the user's existing local clones.

Operations used:
- `Repository::open` — open the user's existing local repo
- `Repository::head` — read the current checked-out branch (HEAD)
- `Repository::branches` — list available local and remote-tracking branches for the dropdown
- `Repository::worktree` — create a worktree for a chat session when the user switches branches
- `Worktree::prune` — clean up worktrees when a session closes

Using git2 in Rust avoids spawning `git` CLI subprocesses and gives precise control over progress reporting.

---

## SQLite (rusqlite)

A single `app.db` SQLite file stores app-level state:

- Copilot auth connection status
- Project list (id, name, created date, squad path)
- Repo list per project (id, project_id, local_path, last branch read)
- Session list per project (id, project_id, name, role, created date, branch map snapshot)

Session conversation history (the actual messages) is stored as JSON files per session rather than in SQLite, to keep the database small and the message format flexible.

---

## LLM Provider

The only LLM provider in v1 is **GitHub Copilot** via each user's authenticated account. The Squad SDK routes all LLM calls through the Copilot API using the user's token obtained via `gh auth login`.

A configurable fallback provider (Claude API or Azure OpenAI) is planned for v2 for team members without a Copilot seat. The Squad `squad.config.ts` already supports model fallback chains, so this is a configuration change rather than a structural one.

---

## Build and Distribution

- **macOS:** `.dmg` installer, signed and notarised with Apple Developer certificate
- **Windows:** `.msi` installer, signed with a code signing certificate
- Built via `tauri build` in CI (GitHub Actions)
- The Node.js sidecar is compiled to a platform-specific binary via `pkg` and included in the Tauri resource bundle
- Auto-update via Tauri's built-in updater plugin, pulling from a GitHub Releases endpoint
