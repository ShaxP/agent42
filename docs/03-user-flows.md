# 03 — User Flows

## Flow 1 — First-time setup

```
Launch app
  → Welcome / Sign-in screen
    → Click "Sign in with GitHub Copilot"
        → OS browser opens GitHub OAuth
        → User authorises → browser closes
        → "Copilot connected" checkmark appears
    → "Continue" button becomes active
    → Click Continue
  → Home screen (empty state — no projects yet)
```

---

## Flow 2 — Create a project

```
Home screen
  → Click "+ New Project" in sidebar
    → Step 1: Enter project name → Continue
    → Step 2: Add repositories
        → Click "Add Repository" → native folder picker opens
        → User navigates to a locally cloned repo folder → Select
        → App validates it is a git repo (checks for .git folder)
        → Repo appears in list showing name, path, current branch
        → Repeat for each repo in the solution
        → (Alternative) Drag repo folders directly onto the panel
        → Continue
    → Step 3: Done — confirmation screen
        → Click "Open Chat"
  → Chat window opens for this project
```

---

## Flow 3 — Returning user, starting a new question

```
Launch app
  → Home screen (project list visible)
    → Click project in sidebar
    → Project overview loads on right
    → Click "Open Chat"
  → New chat window opens
    → Role defaults to last used role
    → Branches reflect whatever is currently checked out in each local repo
    → User types question → Send
  → Response streams in
```

---

## Flow 4 — Switching branch via dropdown

```
Chat window open
  → In header bar, click the branch dropdown for a specific repo
    → Searchable list of local branches appears
    → User selects a branch
    → Spinner appears on the dropdown while checkout runs
    → Dropdown settles on new branch name
    → Status line at bottom of input updates to reflect new branch
  → Next message sent uses the new branch context
```

---

## Flow 5 — Switching branch via prompt

```
Chat window open
  → User types: "Switch the backend repo to release/2.4"
    → Squad coordinator recognises this as a workspace command
    → Branch checkout runs in background
    → Agent confirms in chat: "Switched backend to release/2.4"
    → Branch dropdown in header updates automatically
  → Conversation continues on new branch
```

---

## Flow 6 — Opening a second chat window on a different branch

```
Home screen or existing chat window
  → Click "Open Chat"
    → New independent chat window opens
    → User changes role to "QA Lead"
    → User switches frontend repo branch to "feature/checkout-flow"
    → User asks a question about test coverage on that branch
  → Both windows run simultaneously and independently
  → Both share the same project knowledge base (.squad/)
```

---

## Flow 7 — Switching role mid-session

```
Chat window open, mid-conversation
  → Click the role badge/dropdown in the header
    → Role list appears
    → User selects "Security Reviewer"
    → Role badge updates
  → Next message is sent with Security Reviewer role context
  → Previous messages are unaffected
  → Agent metadata label on next response reflects new role
```

---

## Flow 8 — Adding a repo to an existing project

```
Home screen
  → Select project
  → Click "Manage Repos"
    → Click "Add Repository"
      → Native folder picker opens
      → User selects a locally cloned repo folder
      → App validates it is a git repo
      → Repo appears in the list immediately
    → Branch dropdowns in all open chat windows for this project
      update to include the new repo
```

---

## Flow 9 — Repo updated externally by the user

```
User runs git pull / switches branch in their own git client
  → App detects the change on the next message sent in any chat window
    (reads current HEAD from the .git folder at send time)
  → Branch dropdown in the header updates to reflect the new branch
  → Responses are automatically based on the current checkout state
  → No manual sync action required
```

---

## Flow 10 — Browsing accumulated knowledge

```
Chat window open
  → Click knowledge panel toggle (top-right of window)
    → Panel slides open on the right
    → User clicks "Learnings" tab
      → Scrollable list of agent memory entries
      → User types in search field to filter
    → User clicks "Decisions" tab
      → Chronological list of recorded decisions
    → User clicks "Repos" tab
      → Local path and current branch per repo
```

---

## Flow 11 — Revisiting a past session

```
Chat window
  → Click "Sessions" button in header
    → Session history panel slides in from right
    → User searches or scrolls to find a past session
    → Click session entry
  → New chat window opens
    → Full conversation history restored
    → Branch state from that session restored
    → User can continue the conversation
```

---

## Flow 12 — Exporting the knowledge base

```
Home screen
  → Right-click or use overflow menu (…) on a project
    → Select "Export Knowledge"
      → File save dialog opens
      → Saves a .squad-export.json file to chosen location

Teammate imports on their own machine:
  → Home screen → project overflow menu → "Import Knowledge"
    → File picker opens → select .squad-export.json
    → Knowledge merged into their local project .squad/ folder
    → Their own local repo paths are used — only the agent knowledge
      is imported, not any path configuration
```
