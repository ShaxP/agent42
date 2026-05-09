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

