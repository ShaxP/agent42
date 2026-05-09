---
name: "design-phase-ci-gate"
description: "Replace placeholder CI failures with real baseline checks for pre-implementation repos"
domain: "ci-workflows"
confidence: "high"
source: "earned"
---

## Context

Some repositories are intentionally in design/planning phase and do not yet contain build manifests (`package.json`, `Cargo.toml`) or runnable test suites. In those repos, CI should still enforce meaningful quality gates without fake build commands.

## Patterns

- Replace placeholder fail steps with deterministic baseline checks that reflect current project reality.
- Validate key project contract files (for this project: README design-phase marker and required docs set).
- Keep checks strict enough to catch accidental regressions (missing/empty required artifacts), but avoid inventing runtime/build commands that do not exist yet.
- As code appears, upgrade the baseline gate to actual stack-specific build/test commands.

## Example

```bash
set -euo pipefail
test -f README.md
grep -q "Design phase — no source code yet." README.md
for file in docs/01-product-overview.md docs/10-development-workflow.md; do
  test -s "$file"
done
```

## Anti-Patterns

- Keeping a permanent placeholder `exit 1` in CI.
- Adding `npm test`/`cargo test` in repos with no matching manifests.
- Making CI pass with no checks at all.
