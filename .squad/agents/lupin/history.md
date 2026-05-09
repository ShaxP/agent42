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
