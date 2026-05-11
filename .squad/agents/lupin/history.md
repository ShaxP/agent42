# Project Context

- **Project:** agent42
- **Created:** 2026-05-09
- **Requested by:** ShaxP

## Core Context

Backend role initialized for Agent 42.

## Learnings

- Sidecar responsibilities are defined in `docs/04-technical-architecture.md`.
- IPC protocol is JSON over stdin/stdout between shell and sidecar.
- 2026-05-09T15:39:28.269+02:00 — Tauri command/event contracts for chat/session core are now stubbed in Rust with stable camelCase payloads and mock-safe behavior.
- 2026-05-09T15:39:28.269+02:00 — Backend now emits `agent_status`, `response_chunk`, `response_done`, and `branch_changed` consistently, with error-first propagation on invalid message/branch inputs.

## Cross-Agent Updates (2026-05-09T15:39:28.269+02:00)

- **Hermione integration complete:** Frontend chat/session UI now wired to backend contract surface. Typed Tauri wrappers established for all commands and events. UI remains network-isolated with safe fallbacks.
- **Moody coordination:** PR #3 opened integrating feat/chat-session-core to main. All checks green. snape-review gate updated to exclude lockfiles, improving diff clarity for AI verdicts.
- **Next phase:** Sidecar orchestration pending. Backend mock streaming in send_message ready for replacement with real agent responses once transport connected.
