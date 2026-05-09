# Squad Decisions

## Active Decisions

1. **Branch-per-feature is mandatory.** All feature work happens on a dedicated branch and is never started on `main`.
2. **PR-only integration to `main`.** Merges happen only through pull requests.
3. **AI reviewer gate is mandatory.** Every PR is reviewed by **Snape** (AI, GPT-4o via `snape-review` GitHub Actions check). Human approvals are not required (`required_approving_review_count = 0`). The gate fails closed — if `OPENAI_API_KEY` is absent or the API fails, merges are blocked.
4. **Clean code is enforced.** PRs are evaluated for readability, simplicity, naming clarity, and maintainability.
5. **Communication style preference.** Team responses to ShaxP should be direct, critical, and challenge assumptions instead of default affirmation.

## Recent Directives

- **2026-05-09T14:35:07.382+02:00:** User directive — Use branch-per-feature workflow, PR-only merges to main, mandatory critical reviewer gate, clean-code principles, and direct/challenging communication style. (ShaxP via Copilot)
- **2026-05-09T14:49:30.339+02:00:** User directive — Replace human reviewer gate with AI-gated approval. `snape-review` GitHub Actions check (GPT-4o) is the mandatory PR gate. `required_approving_review_count = 0`. Fails closed when `OPENAI_API_KEY` is absent. (ShaxP via Moody)

## Governance

- All meaningful changes require team consensus
- Document architectural decisions here
- Keep history focused on work, decisions focused on direction
