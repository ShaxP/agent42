# Moody decision inbox — chat core PR gate stability

- **Date:** 2026-05-09T15:39:28.269+02:00
- **Owner:** Moody
- **Branch:** `feat/chat-session-core`

## Decision

Updated `snape-review` workflow diff collection to exclude lockfiles:
- `package-lock.json`
- `pnpm-lock.yaml`
- `yarn.lock`

## Rationale

- AI gate verdicts were unstable when a truncated diff was dominated by lockfile churn.
- Excluding lockfiles keeps review context focused on merge-critical implementation changes.
- Fail-closed behavior is preserved; if no meaningful code diff remains, the workflow still blocks merge via verdict handling.

