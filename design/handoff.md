# Agent 42 — Design Handoff

> This document is written for an AI coding agent. Read this file first,
> then read every file listed under "Source of truth" before writing any code.

---

## What you are building

A native desktop application called **Agent 42**. It allows software development
team members to have AI-powered, role-aware conversations with multi-repository
codebases using GitHub Copilot and Squad agents.

Built with: Tauri 2 (Rust shell) + React 19 + TypeScript + Tailwind CSS.

---

## Source of truth — read all of these before writing any component

| File | What it contains |
|---|---|
| `design/tokens.css` | All CSS custom properties: colors, typography, spacing, radii, shadows |
| `design/tokens.json` | Same tokens in JSON for TypeScript consumption |
| `design/component-inventory.md` | Every UI component, its variants, states, and props |
| `design/screen-specs.md` | Component hierarchy and layout behaviour per screen |
| `design/mockups/` | Visual reference screenshots for every screen and key state |
| `docs/02-ui-description.md` | Prose description of every screen |
| `docs/03-user-flows.md` | All user journeys and interaction flows |
| `docs/04-technical-architecture.md` | System architecture and Tauri IPC contracts |
| `docs/09-data-models.md` | TypeScript types for all data structures |

---

## Mockup index

| File | Screen |
|---|---|
| `mockups/01-signin.png` | Welcome / Sign-in screen |
| `mockups/02-home-empty.png` | Home screen — no projects yet |
| `mockups/02-home-project.png` | Home screen — project selected |
| `mockups/03-new-project-step1.png` | New project — Step 1 (name) |
| `mockups/03-new-project-step2.png` | New project — Step 2 (add repos) |
| `mockups/03-new-project-step3.png` | New project — Step 3 (done) |
| `mockups/04-manage-repos.png` | Manage repos screen |
| `mockups/05-chat-default.png` | Chat window — default state |
| `mockups/05-chat-streaming.png` | Chat window — response streaming |
| `mockups/05-chat-knowledge-open.png` | Chat window — knowledge panel expanded |
| `mockups/05-chat-branch-dropdown.png` | Chat window — branch dropdown open |
| `mockups/05-chat-role-dropdown.png` | Chat window — role selector open |
| `mockups/06-session-history.png` | Session history panel |

---

## Implementation rules

### Styling
- Use **Tailwind CSS utility classes only**. No inline styles, no CSS modules,
  no styled-components.
- All color values must reference CSS custom properties from `tokens.css`.
  Never hardcode hex values — use `var(--color-*)` or the Tailwind token aliases.
- Dark theme is the **only** theme in v1. Do not build a light mode.
- Typography: monospace font (`font-mono`) in all code blocks and file paths.
  System font stack everywhere else.

### Component library
- All interactive primitives (dropdowns, modals, popovers, tooltips, context menus)
  must be built on **Radix UI** for accessibility compliance.
- Name every component file exactly as it appears in `component-inventory.md`.
  The Squad agents will reference these names in future sessions.
- Build the component library first, then compose screens from components.
  Never build a screen from scratch without first checking whether the needed
  components already exist.

### Layout
- The **chat message list** is the primary viewport in the chat window.
  Everything else (header, input, knowledge panel) is secondary and must
  not compete for visual weight.
- The knowledge panel is a collapsible right sidebar. It is **collapsed by default**.
  It must not shift the chat layout when it opens — overlay or push with a
  smooth transition.
- The home screen uses a fixed narrow left sidebar and a fluid right content area.

### Chat and streaming
- Streaming text must render **progressively** — append tokens as they arrive.
  Never buffer a complete response before displaying it.
- The agent status line ("Architect responding…") must appear **above** the
  streaming text and disappear once the final merged response begins.
- Code blocks within responses must be syntax-highlighted using
  `react-syntax-highlighter` with a dark theme matching the app palette.
  Include a copy-to-clipboard button on every code block.

### Tauri integration
- All data fetching goes through **Tauri commands** via `@tauri-apps/api/core invoke`.
  No direct API calls from React components.
- Streaming responses arrive as Tauri **events**, not as a promise return value.
  Listen with `@tauri-apps/api/event listen` and append chunks to component state.
- Use the TypeScript types from `docs/09-data-models.md` verbatim.
  Do not redeclare types that are already defined there.

### Interactions
- Every dropdown, modal, and popover must be **keyboard navigable** and
  closeable with Escape.
- Branch dropdowns must include a **search/filter field** — projects can have
  many branches.
- Role badge colours must match the palette defined in `tokens.css` exactly.
  Each role has a distinct colour; see `component-inventory.md` for the mapping.
- Confirmation dialogs for destructive actions (remove repo, delete session)
  must require an explicit button click — no auto-dismiss, no click-outside-to-confirm.

### Accessibility
- All interactive elements must have accessible labels (aria-label or visible text).
- Focus must be managed correctly when modals and panels open and close.
- Do not rely on colour alone to convey state — use icons or text labels too.

---

## Build order

Build in this sequence. Do not skip ahead.

1. **Design tokens** — import `tokens.css`, configure Tailwind to reference
   the CSS custom properties.
2. **Base components** — Button, Badge, Input, Dropdown, Modal, Tabs, CodeBlock.
   One component file per component.
3. **Layout shells** — two-panel home layout and the chat window shell
   (header bar, message area, input area, collapsible sidebar).
4. **Screens** — compose each screen from components and shells.
   Order: Sign-in → Home → New Project flow → Manage Repos →
   Chat window → Session History.
5. **Tauri wiring** — connect each screen to its Tauri commands and events.
   Replace mock/static data with real invoke calls.
6. **Streaming** — implement the Tauri event listener for chat response chunks.

---

## File structure (frontend)

```
src/
  components/
    ui/               ← base components (Button, Badge, Input, etc.)
    layout/           ← layout shells (HomePanels, ChatWindow, etc.)
    chat/             ← chat-specific components (MessageList, MessageBubble, etc.)
    knowledge/        ← knowledge panel components
    repos/            ← repo management components
    sessions/         ← session history components
  screens/
    SignIn.tsx
    Home.tsx
    NewProjectFlow.tsx
    ManageRepos.tsx
    ChatWindow.tsx
    SessionHistory.tsx
  store/
    auth.ts           ← Zustand auth slice
    projects.ts       ← Zustand projects slice
    sessions.ts       ← Zustand sessions slice (per chat window)
  lib/
    tauri.ts          ← typed wrappers around invoke and listen
    tokens.ts         ← re-exports from tokens.json for TS use
  types/
    index.ts          ← re-exports all types from docs/09-data-models.md
```

---

## Known deferred features — do not build in v1

- Light mode / theme switcher
- GitHub or GitLab OAuth and remote repo browsing
- App-managed repo cloning and remote sync
- Webhook registration for auto-sync
- LLM fallback provider configuration
- Knowledge base export / import UI (backend exists, UI is v2)
