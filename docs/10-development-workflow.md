# 10 — Development Workflow Rules

This project follows a strict branch + PR workflow.

## Non-negotiable rules

1. Every feature/fix is developed on its own branch.
2. `main` is integration-only; no direct feature commits.
3. Every branch merges through a pull request.
4. Every pull request requires critical review before approval.
5. Clean code standards are mandatory for merge readiness.

## Branch convention

- `feat/<short-description>`
- `fix/<short-description>`
- `chore/<short-description>`

Examples:
- `feat/chat-streaming-events`
- `fix/repo-picker-validation`
- `chore/update-tauri-command-types`

## Pull request expectations

- Focused scope and clear intent
- Readable, maintainable code with explicit naming and error handling
- No hidden side effects or unrelated edits
- Reviewer comments are resolved before merge

## Review gate

- **Assigned reviewer:** Snape (Code Reviewer)
- Reviewer is expected to challenge assumptions and reject weak implementations.
- Approval is granted only when correctness, clarity, and maintainability are defensible.
