# Squad Decisions

## Active Decisions

1. **Branch-per-feature is mandatory.** All feature work happens on a dedicated branch and is never started on `main`.
2. **PR-only integration to `main`.** Merges happen only through pull requests.
3. **AI reviewer gate is mandatory.** Every PR is reviewed by **Snape** (AI, GPT-4o via `snape-review` GitHub Actions check). Human approvals are not required (`required_approving_review_count = 0`). The gate fails closed — if `OPENAI_API_KEY` is absent or the API fails, merges are blocked.
4. **Clean code is enforced.** PRs are evaluated for readability, simplicity, naming clarity, and maintainability.
5. **Communication style preference.** Team responses to ShaxP should be direct, critical, and challenge assumptions instead of default affirmation.
6. **require_last_push_approval disabled on main.** Temporarily set to `false` to unblock PR-only flow with AI-gated checks, resolving deadlock in single-maintainer workflows.
7. **snape-review excludes lockfiles.** Diff collection excludes `package-lock.json`, `pnpm-lock.yaml`, `yarn.lock` to keep AI review focused on implementation rather than dependency churn.

## Recent Directives

- **2026-05-09T14:35:07.382+02:00:** User directive — Use branch-per-feature workflow, PR-only merges to main, mandatory critical reviewer gate, clean-code principles, and direct/challenging communication style. (ShaxP via Copilot)
- **2026-05-09T14:49:30.339+02:00:** User directive — Replace human reviewer gate with AI-gated approval. `snape-review` GitHub Actions check (GPT-4o) is the mandatory PR gate. `required_approving_review_count = 0`. Fails closed when `OPENAI_API_KEY` is absent. (ShaxP via Moody)

## Chat/Session Core Contracts (2026-05-09)

**Owner:** Lupin  
**Frontend Owner:** Hermione

### Backend Command Surface (`src-tauri/src/main.rs`)

- `get_session_list` — Retrieve active sessions
- `list_branches` — List repository branches
- `get_current_branch` — Get active branch name
- `checkout_branch` — Switch to branch
- `send_message` — Submit chat message (mock streaming until sidecar connected)

### Backend Event Emissions

- `response_chunk` — Streamed response fragment
- `response_done` — Chat turn complete (includes `agentsMeta: { mock: boolean }`)
- `agent_status` — Agent state (`running | idle | error` with optional error detail)
- `branch_changed` — Branch switch notification

### Event Contract Detail

- All payloads use `camelCase` format
- Mirrored in `src/types/index.ts`
- Mock flag in `response_done.agentsMeta` distinguishes stubbed vs. real responses during integration
- Error propagation testable before sidecar transport connected

### Frontend Integration (`src/lib/tauri.ts`)

- Typed command/event wrappers abstract Tauri IPC
- React remains network-isolated; all I/O flows through Tauri wrappers
- Non-Tauri runtime fallbacks return safe defaults with placeholder streamed response text
- Supports progressive streaming UX while backend stabilizes

## Governance

- All meaningful changes require team consensus
- Document architectural decisions here
- Keep history focused on work, decisions focused on direction
