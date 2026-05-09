# Lupin decision inbox — chat/session backend contracts

- **Date:** 2026-05-09T15:39:28.269+02:00
- **Owner:** Lupin
- **Branch:** `feat/chat-session-core`

## Decision

Implemented a stable, local-safe backend contract slice in `src-tauri/src/main.rs` for:
- Commands: `get_session_list`, `list_branches`, `get_current_branch`, `checkout_branch`, `send_message`
- Events: `response_chunk`, `response_done`, `agent_status`, `branch_changed`

## Contract Notes

1. Event payloads are emitted in `camelCase` and mirrored in `src/types/index.ts`.
2. `send_message` currently uses deterministic mock streaming (`response_chunk` then `response_done`) while full sidecar orchestration is pending.
3. `agent_status` now carries:
   - `status`: `running | idle | error`
   - `detail` (optional) for error context
4. `response_done.agentsMeta` includes `mock: boolean` to let frontend distinguish stubbed responses during integration.

## Rationale

- Keeps frontend/backend integration unblocked with compile-stable contracts.
- Preserves explicit typed shapes for predictable IPC wiring.
- Makes error propagation testable before real sidecar transport is connected.
