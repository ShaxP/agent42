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

- **Mechanism:** AI-gated via the `snape-review` GitHub Actions status check.
- The check calls OpenAI (GPT-4o) to review the PR diff and returns a PASS or FAIL verdict.
- **Fail criteria:** The gate fails only for merge-critical findings (correctness bugs, security/privacy risks, broken CI/build behavior, data-loss/corruption risk, or similarly unsafe defects).
- **Advisory feedback:** Process or non-blocking suggestions (for example optional backup reviewers, template enhancements, or optional workflow refinements) do not fail the check by themselves.
- **Required secret:** `OPENAI_API_KEY` must be configured in repository → Settings → Secrets → Actions.
- If the secret is absent or the API call fails, the check **fails closed** — merges are blocked, not bypassed.
- Human approvals are not required (`required_approving_review_count = 0`).
- `snape-review` is a required status check on `main`; the PR cannot merge without it passing.
- The reviewer is expected to challenge assumptions and reject weak implementations.
- Approval is granted only when correctness, clarity, and maintainability are defensible.
