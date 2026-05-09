# Moody decision inbox — chat/session core handoff

- **Date:** 2026-05-09T15:39:28.269+02:00
- **Owner:** Moody
- **Branch:** `feat/chat-session-core`

## Scope split (parallel-safe)

### Hermione — Frontend chat/session UI slice

Target files/components:
- `src/screens/ChatWindow.tsx` (replace placeholder shell with wired composition)
- `src/components/chat/ChatHeader.tsx`
- `src/components/chat/BranchSelector.tsx`
- `src/components/chat/RoleSelector.tsx`
- `src/components/chat/MessageList.tsx`
- `src/components/chat/ChatInput.tsx`
- `src/components/knowledge/KnowledgePanel.tsx`
- `src/components/sessions/SessionHistoryPanel.tsx`
- `src/store/sessions.ts` (new session slice for messages/active role/branchMap/panels)
- `src/lib/tauri.ts` (typed wrappers/listeners for new chat/session commands + events)

### Lupin — Backend platform command slice

Target files/components:
- `src-tauri/src/main.rs` (command surface + event emission wiring)
- `src-tauri/Cargo.toml` (only if new Rust deps are needed for command implementation)
- `src/types/index.ts` (shared contract updates only when command payloads change)

Command/event contract targets to implement and keep stable:
- Commands: `get_session_list`, `list_branches`, `get_current_branch`, `checkout_branch`, `send_message`
- Events: `response_chunk`, `response_done`, `agent_status`, `branch_changed`

## Decision

Use this branch as the integration base for the chat/session core and keep contracts local-first (no direct network calls from React; all flows through Tauri commands/events).
