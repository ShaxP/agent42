# 07 — Auth Strategy

## Principles

- The only authentication required in v1 is GitHub Copilot.
- The token is stored exclusively in the OS keychain — never written to disk in plaintext.
- Auth is performed once at first launch and refreshed silently in the background.
- There is no GitHub API auth, no GitLab auth, and no remote repo access of any kind in v1.

---

## GitHub Copilot

**Method:** OAuth via the `gh` CLI credential store.

The user clicks "Sign in with GitHub Copilot" in the app. The app launches a `gh auth login --scopes copilot` flow in the OS browser. On completion, `gh` stores the token in its own credential store (`~/.config/gh/hosts.yml` on macOS/Linux, equivalent on Windows).

The Node.js sidecar reads the token at startup:

```typescript
import { execSync } from 'child_process';
const token = execSync('gh auth token').toString().trim();
process.env.COPILOT_TOKEN = token;
```

This token is injected into the Squad SDK's `SquadClientWithPool` constructor. It is never written to any file owned by Agent 42.

**Validation:** On app start, the Tauri shell runs `gh auth status` to verify the token is still valid. If it has expired, the UI shows an authentication warning banner and prompts the user to re-authenticate. The user is taken back to the sign-in screen.

**Scope required:** `copilot`

**Prerequisite:** The user must have the `gh` CLI installed and a GitHub account with an active Copilot subscription. The app checks for the presence of `gh` on startup and shows an actionable error if it is not found, with a link to the installation page.

---

## Token Storage

The Copilot token is managed by `gh` in its own credential store. Agent 42 does not copy or re-store the token — it reads it fresh from `gh auth token` each time the sidecar starts.

If the `gh` credential store is protected by the OS keychain (which it is by default on macOS), the token inherits that protection automatically.

---

## Auth State in the UI

The app tracks Copilot auth state as one of:
- `authenticated` — token present and valid
- `unauthenticated` — `gh` not logged in or no Copilot scope
- `expired` — token stored but last Copilot API call returned 401
- `checking` — validation in progress on app start

This state is shown on the sign-in screen and as a compact indicator in the home screen sidebar. If the state becomes `expired` while the user is active, a non-blocking banner appears prompting re-authentication. Active chat sessions are paused (not lost) until re-authentication completes.

---

## v2 Considerations (out of scope for v1)

GitHub and GitLab OAuth will be added in a future version to support:
- Browsing and adding repos without leaving the app
- Automatic webhook registration for near-real-time repo sync
- PAT-based auth for self-hosted GitLab instances

These are additive — the v1 auth architecture does not need to change to accommodate them.
