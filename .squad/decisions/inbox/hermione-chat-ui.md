# Hermione decision inbox — chat/session UI core

- **Date:** 2026-05-09T15:39:28.269+02:00
- **Owner:** Hermione
- **Branch:** `feat/chat-session-core`

## Decision

Frontend chat/session flows now route through typed Tauri wrappers/events for command/event names agreed in handoff (`get_session_list`, `list_branches`, `get_current_branch`, `checkout_branch`, `send_message`; `response_chunk`, `response_done`, `agent_status`, `branch_changed`).

## Rationale

- Keeps React network-isolated and contract-first.
- Supports progressive streaming UX now while backend responses are pending.
- Avoids Rust/shared-contract edits in this slice.

## Notes for integration

- In non-Tauri runtime, wrappers return safe fallbacks and chat shows placeholder streamed response text.
- Once backend payloads stabilize, UI can consume richer `agentsMeta` without structural changes.
