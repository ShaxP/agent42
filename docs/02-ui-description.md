# 02 — UI Description

> This document describes the user interface screen by screen for use by a designer creating mockups. It describes layout, components, and visual intent — not pixel measurements.

## Overall Visual Style

The app is a focused developer tool. Dark-themed by default. Dense but not cluttered — similar in spirit to VS Code or Linear. It is a native desktop app and should feel native on macOS and Windows: proper window chrome, system fonts, drag-and-drop support, and native context menus. No playful illustrations or onboarding mascots. Clean, professional, and fast.

---

## Screen 1 — Welcome / Sign-in

**When shown:** First launch, or when the Copilot session has expired.

**Layout:** Centered card on a dark background. App logo and name at the top. Below, a brief explanation and a single sign-in action.

**Components:**
- App logo + wordmark "Agent 42"
- One-line explanation beneath the logo: "Agent 42 uses GitHub Copilot as its AI engine. Sign in with your GitHub account to connect your Copilot subscription."
- **Sign in with GitHub Copilot** — primary button, the only auth action on this screen
- Status indicator below the button: a checkmark and "Copilot connected" confirmation once authentication completes
- **Continue** button — appears once Copilot is authenticated

---

## Screen 2 — Home / Project List

**When shown:** After sign-in, on every subsequent launch.

**Layout:** Two-panel layout. Narrow sidebar on the left, main content area on the right.

**Left sidebar:**
- App logo / name at the very top
- List of project names. Each entry shows the project name and the number of repos in it.
- Active project is highlighted
- **+ New Project** button pinned to the bottom of the sidebar

**Right panel — project overview (when a project is selected):**
- Project name at the top, editable inline by clicking it
- **Repos section:** list of repos in the project. Each repo shows name, local path (truncated), current branch, and last time the app read it. No sync controls — the user manages their repos with their own git client.
- **Recent Sessions section:** list of the last 5–10 sessions for this project. Each entry shows session name, role badge, and last activity timestamp. Clicking a session opens it.
- **Open Chat** button — prominent, opens a new chat window for this project
- **Manage Repos** button — navigates to the Manage Repos screen

**Right panel — empty state (no project selected or no projects exist):**
- Illustration-free empty state with the text "No projects yet" and a single **Create your first project** button.

---

## Screen 3 — New Project Flow

**When shown:** Triggered by **+ New Project**. Presented as a full-panel overlay on top of the home screen, not a separate window.

### Step 1 — Name the project
- Single large text input: *Project name*
- Helper text: "This is your local name for this solution."
- **Continue** button (disabled until input is non-empty)

### Step 2 — Add repositories
- Instruction text at the top: "Point Agent 42 to the local folders where your repositories are checked out."
- A list of added repos (empty at first), each showing: folder icon, repo name (detected from the folder), local path, current branch. A remove (×) button per entry.
- An **Add Repository** button that opens a native folder picker dialog. The user selects a local folder. The app validates it is a git repository (checks for a `.git` folder). If valid, it is added to the list. If not valid, an inline error is shown: "This folder does not appear to be a git repository."
- Drag-and-drop support: the user can drag a folder from Finder / Explorer directly onto this panel to add it.
- Warning banner if more than 10 repos are added: "Large projects with many repositories may affect response times."
- **Back** and **Continue** buttons

### Step 3 — Done
- Confirmation view: project name and list of added repos with green checkmarks
- Single **Open Chat** button

---

## Screen 4 — Manage Repos

**When shown:** From the project overview via **Manage Repos**.

**Layout:** Full-panel view replacing the project overview content area.

**Components:**
- **Add Repository** button at the top right — opens the native folder picker, same as Step 2 of the new project flow
- List of repos. Each row: folder icon, repo name, local path (truncated, full path shown on hover), current branch, **Remove** button
- Remove triggers a confirmation dialog: "Remove [repo name] from this project? The local folder will not be deleted."
- No sync controls. Users manage branches and pulls with their own git client. The app reads whatever is currently checked out.

---

## Screen 5 — Chat Window

**When shown:** Opens as a separate native window. Multiple chat windows can be open simultaneously. Each is independent and can be positioned freely on screen.

### 5a — Window header bar

A persistent bar across the top of the window containing:

- **Project name** — left-most, non-interactive label
- **Session name** — editable inline by clicking. Defaults to the first few words of the opening message once sent.
- **Sessions button** — opens the session history panel (see Screen 6)
- **Role selector** — a dropdown badge showing the active role. Options: Architect, Business Analyst, Developer, DevOps Engineer, QA Lead, Tester, Test Automation Expert, DB Expert, Security Reviewer, Technical Writer. Changing mid-session is allowed and takes effect on the next message.
- **Branch selectors** — one compact dropdown per repo in the project, each labelled with the repo's short name and showing the currently checked-out branch. If there are more than 3 repos, the selectors collapse into a single **Branches** button that opens a popover listing all repos and their dropdowns. A spinner replaces the branch name while a checkout is in progress.
- **Knowledge panel toggle** — a button on the far right to expand/collapse the knowledge sidebar

### 5b — Main chat area

Occupies the majority of the window between the header and the input area.

- User messages: right-aligned, subtle background bubble
- Agent responses: left-aligned, no bubble, text directly on background
- Code blocks: syntax-highlighted, with a copy button in the top-right corner
- Long agent responses: major sections are collapsible with a toggle
- Above each agent response: a small metadata label — "Architect + Security Reviewer · as QA Lead" — showing which agents contributed and the active role at the time
- Streaming responses render token by token. While streaming, a subtle pulsing indicator is shown. If multiple agents are running in parallel, a status line above the streaming text reads: "Architect responding… Security Reviewer responding…" — these disappear once the final merged response begins streaming.

### 5c — Input area

Pinned to the bottom of the window.

- Multiline text input that grows vertically as the user types (up to ~5 lines before scrolling internally)
- **Send** button on the right
- **Attach context** button (paperclip icon) on the left — allows the user to attach a file path, paste a code snippet, or drag a file from the repo. The attachment appears as a dismissible chip above the input before sending.
- Status summary line below the input (non-interactive, small text): "Responding as: QA Lead · backend:main · frontend:feature/auth"

### 5d — Knowledge panel (collapsible right sidebar)

Collapsed by default. Expands by clicking the toggle button in the header.

Three tabs:

- **Learnings** — scrollable list of facts written to agent memory during this project's sessions. Each entry: short fact text, timestamp, agent name. Searchable via a field at the top.
- **Decisions** — timeline of decisions recorded in `.squad/decisions.md`. Formatted as a simple chronological list.
- **Repos** — compact list of repos in this project: name, local path, current branch for this window.

---

## Screen 6 — Session History

**When shown:** Triggered by the **Sessions** button in the chat window header, or from the project overview on the home screen.

**Layout:** A slide-in panel from the right side of the chat window, or a modal when accessed from the home screen.

**Components:**
- List of all sessions for the project, newest first
- Each session entry: session name, role badge, date, one-line excerpt of the opening message
- Clicking a session opens it in a new chat window, restoring conversation history and branch state
- Overflow menu per session: **Rename**, **Delete**
- Search field at the top for filtering sessions by name or content
