# Moody decision inbox — MVP kickoff

- **Date:** 2026-05-09T15:39:28.269+02:00
- **Owner:** Moody
- **Context:** PR #1 merge was blocked by `require_last_push_approval` despite `required_approving_review_count = 0` and all checks passing.

## Decision

1. Temporarily set `require_last_push_approval = false` on `main` branch protection to unblock PR-only flow with AI-gated checks.
2. Start first implementation slice on `feat/mvp-foundation-ui-shell` with a buildable Tauri + React shell and visible Sign-in/Home/Chat frame placeholders.
3. Move `squad-ci` from design-phase README marker checks to real `npm test` + `npm run build` checks, while retaining required-doc validation.

## Rationale

- The previous policy combination created a deadlock for single-maintainer flows.
- A visible, buildable shell establishes integration points for subsequent Rust command and UI iterations.
- CI should reflect current repository state once source code exists.
