# Project Context

- **Project:** agent42
- **Created:** 2026-05-09
- **Requested by:** ShaxP

## Core Context

Platform role initialized for Agent 42.

## Recent Activity

**2026-05-09:** Moody enforced PR-only promotion workflow and critical reviewer gate. Updated `.github/workflows/squad-promote.yml`, `.github/workflows/squad-ci.yml`, and `.github/CODEOWNERS` to enforce mandatory reviewer approval from Snape before promotion.

## Learnings

- Native shell owns keychain, git operations, and SQLite app state.
- Worktrees are session/repo specific per architecture docs.

