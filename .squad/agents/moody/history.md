# Project Context

- **Project:** agent42
- **Created:** 2026-05-09
- **Requested by:** ShaxP

## Core Context

Platform role initialized for Agent 42.

## Recent Activity

**2026-05-09:** Moody added AI-gated PR approval workflow (`snape-review`). Created `.github/workflows/snape-review.yml` — GPT-4o reviews PR diffs and posts PASS/FAIL comments. Fails closed when `OPENAI_API_KEY` is absent. Updated `main` branch protection: `required_approving_review_count = 0`, `snape-review` added as required status check. Updated `docs/10-development-workflow.md` and `.squad/decisions.md` to reflect AI-gated policy.

## Learnings

- Native shell owns keychain, git operations, and SQLite app state.
- Worktrees are session/repo specific per architecture docs.
- 2026-05-09T15:32:24.576+02:00 — `squad-ci` must run real checks even in design-only repos; for this project the gate validates README design-phase marker and required docs presence instead of placeholder failure steps.
- 2026-05-09T15:32:24.576+02:00 — `snape-review` should block merges only for merge-critical risks (correctness/security/build/data-loss), while process-only suggestions stay advisory; fail-closed remains mandatory for missing/failed OpenAI access.
- 2026-05-09T15:32:24.576+02:00 — Key paths for gate policy: `.github/workflows/squad-ci.yml`, `.github/workflows/snape-review.yml`, and `docs/10-development-workflow.md`.
- 2026-05-09T15:39:28.269+02:00 — When bootstrapping from design-only to code-bearing state, convert `squad-ci` from README marker checks to real Node build/test checks in the same PR so branch protection stays truthful.
- 2026-05-09T15:39:28.269+02:00 — Tauri 2 compile fails fast if `src-tauri/icons/icon.png` is missing or not RGBA; seed a valid RGBA icon during initial scaffold to keep `cargo check` green.
