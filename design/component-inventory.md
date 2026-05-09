# Agent 42 — Component Inventory

This is the complete inventory of reusable UI components visible in the mockups.
Each entry maps to a file the coding agent will create. Filenames are the
component name in PascalCase (e.g. `Button.tsx`).

All components consume tokens from `tokens.css` / `tokens.json` — never inline
hex values or magic numbers.

---

## Primitives

---
### Button

**Description:** Standard interactive button used for all primary, secondary, and ghost actions.

**Variants:** `primary` | `secondary` | `ghost` | `danger`

**States:** `default` | `hover` | `active` | `disabled` | `loading`

**Props:**
```typescript
interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md';
  disabled?: boolean;
  loading?: boolean;
  iconLeft?: React.ReactNode;
  iconRight?: React.ReactNode;
  onClick?: () => void;
  children: React.ReactNode;
}
```

**Used in:** Sign-in, Home, New Project flow, Manage Repos, Chat window, Modals.

---
### IconButton

**Description:** Compact square button containing only an icon — used for close, more, panel toggles, etc.

**Variants:** `default` | `subtle`

**States:** `default` | `hover` | `active` | `disabled`

**Props:**
```typescript
interface IconButtonProps {
  icon: React.ReactNode;
  label: string;        // accessible name
  variant?: 'default' | 'subtle';
  size?: 'sm' | 'md';
  onClick?: () => void;
  disabled?: boolean;
}
```

**Used in:** Banner (dismiss), Knowledge panel (close), Chat header (panel toggle), Manage Repos (remove).

---
### Badge

**Description:** Small inline label for metadata, counts, or generic tags.

**Variants:** `neutral` | `accent` | `success` | `warning` | `error`

**States:** `default`

**Props:**
```typescript
interface BadgeProps {
  variant?: 'neutral' | 'accent' | 'success' | 'warning' | 'error';
  size?: 'xs' | 'sm';
  children: React.ReactNode;
}
```

**Used in:** Branches button (count), repo row (branch tag), New Project flow.

---
### RoleBadge

**Description:** Specialized badge displaying one of the ten Agent 42 roles with its themed color pair.

**Variants:** One per role — `architect` | `analyst` | `developer` | `devops` | `qaLead` | `tester` | `automation` | `dbExpert` | `security` | `techWriter`

**States:** `default` | `active` (with leading pulse dot) | `done` (with leading check) | `queued` (with leading muted dot)

**Props:**
```typescript
type Role =
  | 'Architect' | 'Business Analyst' | 'Developer' | 'DevOps Engineer'
  | 'QA Lead' | 'Tester' | 'Test Automation Expert' | 'DB Expert'
  | 'Security Reviewer' | 'Technical Writer';

interface RoleBadgeProps {
  role: Role;
  size?: 'xs' | 'sm' | 'md';
  state?: 'default' | 'active' | 'done' | 'queued';
}
```

**Used in:** Recent sessions list, agent message contributor row, role selector, knowledge panel decisions, sessions panel.

---
### Input

**Description:** Single-line text input with consistent border, focus ring, and disabled treatment.

**Variants:** `default` | `inline` (transparent, used for in-place editing)

**States:** `default` | `focus` | `error` | `disabled`

**Props:**
```typescript
interface InputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  variant?: 'default' | 'inline';
  error?: boolean;
  disabled?: boolean;
  iconLeft?: React.ReactNode;
  type?: 'text' | 'email' | 'search';
}
```

**Used in:** New Project step 1 (project name), Sessions sidebar (search), Home (project rename inline).

---
### TextArea

**Description:** Multi-line auto-growing text input used for the chat composer.

**States:** `default` | `focus` | `disabled`

**Props:**
```typescript
interface TextAreaProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
  maxHeight?: number;        // px before internal scroll kicks in
  onSubmit?: () => void;     // Cmd+Enter
  disabled?: boolean;
}
```

**Used in:** ChatInput.

---
### Dropdown

**Description:** Generic single-select trigger that opens a popover of options. Trigger renders the current value.

**States:** `closed` | `open` | `disabled`

**Props:**
```typescript
interface DropdownOption<T = string> {
  value: T;
  label: React.ReactNode;
  description?: string;
}

interface DropdownProps<T = string> {
  value: T;
  options: DropdownOption<T>[];
  onChange: (value: T) => void;
  placeholder?: string;
  disabled?: boolean;
  width?: number | 'auto';
}
```

**Used in:** Role selector trigger, Branch selector menu items.

---
### SearchableDropdown

**Description:** Dropdown extended with a filter input — used when option counts exceed ~8.

**States:** `closed` | `open` | `loading` | `empty-results`

**Props:**
```typescript
interface SearchableDropdownProps<T = string> extends DropdownProps<T> {
  searchPlaceholder?: string;
  loading?: boolean;
  emptyText?: string;
}
```

**Used in:** Branch selector (when a repo has many branches).

---
### Tabs / TabPanel

**Description:** Horizontal segmented tab control with associated panels.

**Variants:** `underline` | `pill` (Knowledge panel uses `pill`)

**States:** `default` | `active` | `hover` | `disabled`

**Props:**
```typescript
interface TabsProps {
  value: string;
  onChange: (value: string) => void;
  variant?: 'underline' | 'pill';
  children: React.ReactNode;  // <Tab id="..." label="..." />
}
interface TabPanelProps { id: string; children: React.ReactNode; }
```

**Used in:** Knowledge panel (Learnings / Decisions / Repos).

---
### Modal

**Description:** Centered overlay dialog with scrim, focus trap, and Esc-to-close.

**Variants:** `default` | `confirmation`

**States:** `closed` | `open`

**Props:**
```typescript
interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
  footer?: React.ReactNode;
}
```

**Used in:** Manage Repos remove confirmation, future: branch picker, settings.

---
### ConfirmationModal

**Description:** Specialized Modal for destructive yes/no confirmations.

**Props:**
```typescript
interface ConfirmationModalProps {
  open: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  title: string;
  message: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
}
```

**Used in:** Manage Repos (remove repository).

---
### Banner

**Description:** Full-width inline alert at the top of a screen — semantic color, dismissible.

**Variants:** `info` | `warning` | `error` | `success`

**States:** `default` | `dismissing`

**Props:**
```typescript
interface BannerProps {
  variant?: 'info' | 'warning' | 'error' | 'success';
  icon?: React.ReactNode;
  message: React.ReactNode;
  action?: { label: string; onClick: () => void };
  onDismiss?: () => void;
}
```

**Used in:** Home (auth-expired), Chat (rate-limit / token-expired in future).

---

## Layout & navigation

---
### AppWindow

**Description:** macOS-style native window chrome wrapping every screen — traffic lights, centered title, content slot.

**Props:**
```typescript
interface AppWindowProps {
  title: string;
  width?: number;
  height?: number;
  children: React.ReactNode;
}
```

**Used in:** Every top-level screen.

---
### Sidebar

**Description:** Generic vertical rail container with header, scrollable body, and footer slots.

**Props:**
```typescript
interface SidebarProps {
  width?: number;
  header?: React.ReactNode;
  footer?: React.ReactNode;
  children: React.ReactNode;
}
```

**Used in:** Home, Sessions panel.

---
### SidebarItem

**Description:** Selectable row inside a Sidebar. Shows label, optional badge/count, and selected state.

**States:** `default` | `hover` | `selected` | `disabled`

**Props:**
```typescript
interface SidebarItemProps {
  label: string;
  count?: number | string;
  icon?: React.ReactNode;
  selected?: boolean;
  onClick?: () => void;
}
```

**Used in:** Home (project list).

---
### ProjectItem

**Description:** Sidebar item specialized for projects — name + repo count.

**Props:**
```typescript
interface ProjectItemProps {
  project: { id: string; name: string; repos: number };
  selected?: boolean;
  onClick?: () => void;
}
```

**Used in:** Home sidebar.

---
### Stepper

**Description:** Horizontal progress indicator for multi-step flows (numbered circles + connecting rules).

**States:** Per step: `active` | `done` | `pending`

**Props:**
```typescript
interface StepperProps {
  steps: { id: string; label: string }[];
  currentId: string;
}
```

**Used in:** New Project flow.

---
### EmptyState

**Description:** Centered illustration + message + optional CTA, used when a list/area has no content.

**Props:**
```typescript
interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: React.ReactNode;
  action?: { label: string; onClick: () => void };
}
```

**Used in:** Home (no projects), Sessions panel (no sessions yet), Manage Repos (no repos), Knowledge tabs (empty).

---

## Chat-specific

---
### ChatWindow

**Description:** Top-level shell composing ChatHeader, MessageList, ChatInput, and optional left/right panels.

**Props:**
```typescript
interface ChatWindowProps {
  sessionId: string;
  showSessionsSidebar?: boolean;
  showKnowledgePanel?: boolean;
}
```

**Used in:** Chat window screen.

---
### ChatHeader

**Description:** The chat window's top bar: project breadcrumb, session name, branch selectors, role selector, panel toggles.

**Props:**
```typescript
interface ChatHeaderProps {
  projectName: string;
  sessionName: string;
  repos: Repo[];
  activeRole: Role;
  onRoleChange: (role: Role) => void;
  onToggleKnowledge: () => void;
}
```

**Used in:** ChatWindow.

---
### SessionNameEditor

**Description:** Inline-editable session title. Click to edit, Enter/blur to save.

**States:** `display` | `editing`

**Props:**
```typescript
interface SessionNameEditorProps {
  value: string;
  onChange: (value: string) => void;
}
```

**Used in:** ChatHeader, Home (project rename uses the same primitive).

---
### BranchSelector

**Description:** Per-repo branch chip showing repo name and current branch. Click opens a SearchableDropdown of branches.

**Variants:** `inline` (one chip per repo) | `collapsed` (single "Branches (N)" trigger that opens a list)

**States:** `default` | `open` | `loading` (during checkout) | `error` (dirty working tree)

**Props:**
```typescript
interface BranchSelectorProps {
  repos: Repo[];
  collapseThreshold?: number;     // default 4
  onCheckout: (repoId: string, branch: string) => Promise<void>;
}
```

**Used in:** ChatHeader.

---
### RoleSelector

**Description:** Active-role chip with dropdown of all ten roles. Tints based on current role color.

**States:** `default` | `open`

**Props:**
```typescript
interface RoleSelectorProps {
  value: Role;
  onChange: (role: Role) => void;
}
```

**Used in:** ChatHeader.

---
### MessageList

**Description:** Scrollable container that renders alternating UserMessage and AgentMessage, plus StreamingIndicator at the tail when an agent is responding.

**Props:**
```typescript
interface MessageListProps {
  messages: Message[];
  streaming?: StreamingState;
}
```

**Used in:** ChatWindow.

---
### UserMessage

**Description:** Message authored by the human — centered column, "You" eyebrow label, no role stripe.

**Props:**
```typescript
interface UserMessageProps {
  text: string;
  attachments?: Attachment[];
  timestamp?: Date;
}
```

**Used in:** MessageList.

---
### AgentMessage

**Description:** Message authored by one or more agents — color stripe (from active role), AgentMetaLabel, rendered markdown body, action row (Copy / Save as Learning / Branch session).

**Props:**
```typescript
interface AgentMessageProps {
  contributors: { agent: AgentName; role: Role; state: 'active'|'done'|'queued' }[];
  activeRole: Role;
  body: string;            // markdown
  actions?: { label: string; onClick: () => void }[];
}
```

**Used in:** MessageList.

---
### AgentMetaLabel

**Description:** Inline pill row above an agent message: contributor RoleBadges with state indicators, "· as <role>" suffix.

**Props:**
```typescript
interface AgentMetaLabelProps {
  contributors: { role: Role; state: 'active'|'done'|'queued' }[];
  activeRole: Role;
}
```

**Used in:** AgentMessage.

---
### CodeBlock

**Description:** Fenced code rendering with monospace font, scrollable overflow, copy button, optional language label.

**Variants:** `inline` (used by markdown renderer) | `block`

**Props:**
```typescript
interface CodeBlockProps {
  code: string;
  language?: string;
  filename?: string;
  showCopy?: boolean;
}
```

**Used in:** AgentMessage body (inline + block).

---
### MarkdownRenderer

**Description:** Renders agent message text — paragraphs, lists, inline code, bold, links.

**Props:**
```typescript
interface MarkdownRendererProps {
  text: string;
  components?: Partial<{ code: React.FC; pre: React.FC; a: React.FC }>;
}
```

**Used in:** AgentMessage, KnowledgeEntry.

---
### AttachmentChip

**Description:** Small chip representing a file/snippet attached to a draft message — filename, optional line range, dismiss button.

**Props:**
```typescript
interface AttachmentChipProps {
  filename: string;
  lineRange?: [number, number];
  onRemove: () => void;
}
```

**Used in:** ChatInput.

---
### StreamingIndicator

**Description:** Animated three-dot bouncer + status caption used at the message-list tail while agents respond.

**Props:**
```typescript
interface StreamingIndicatorProps {
  activeRole: Role;
  caption?: string;
}
```

**Used in:** MessageList tail.

---
### AgentStatusLine

**Description:** One-line status string describing what the active agent is doing right now (e.g. "Security Reviewer is reviewing auth flow…"). Italic, muted.

**Props:**
```typescript
interface AgentStatusLineProps {
  role: Role;
  text: string;
}
```

**Used in:** StreamingIndicator.

---
### ChatInput

**Description:** Composer block: optional AttachmentChip row, TextArea, footer toolbar with attach button, @role mention button, model label, Send button.

**Props:**
```typescript
interface ChatInputProps {
  value: string;
  onChange: (value: string) => void;
  attachments: Attachment[];
  onAddAttachment: () => void;
  onRemoveAttachment: (id: string) => void;
  onSubmit: () => void;
  disabled?: boolean;
  modelLabel?: string;
}
```

**Used in:** ChatWindow.

---

## Knowledge panel

---
### KnowledgePanel

**Description:** Right sidebar with three tabs (Learnings / Decisions / Repos) and a close button.

**Props:**
```typescript
interface KnowledgePanelProps {
  projectId: string;
  onClose: () => void;
}
```

**Used in:** ChatWindow.

---
### LearningsTab

**Description:** Scrollable list of KnowledgeEntry items filtered to learnings.

**Props:** `{ projectId: string }`

**Used in:** KnowledgePanel.

---
### DecisionsTab

**Description:** Scrollable list of decisions with title + author RoleBadge + date.

**Props:** `{ projectId: string }`

**Used in:** KnowledgePanel.

---
### ReposTab

**Description:** Read-only list of repos in the current project — name + path. No actions; manage repos lives elsewhere.

**Props:** `{ projectId: string }`

**Used in:** KnowledgePanel.

---
### KnowledgeEntry

**Description:** Single learning/decision card — body text + repo + date metadata.

**Variants:** `learning` | `decision`

**Props:**
```typescript
interface KnowledgeEntryProps {
  variant: 'learning' | 'decision';
  body: string;
  meta: { repo?: string; author?: Role; date: string };
  onEdit?: () => void;
  onDelete?: () => void;
}
```

**Used in:** LearningsTab, DecisionsTab.

---

## Repo & project

---
### RepoRow

**Description:** Horizontal row representing a repository — folder icon, name, path (truncated, monospace), branch tag, optional actions.

**Variants:** `default` | `selectable` (with checkbox) | `manageable` (with Remove button)

**States:** `default` | `hover` | `selected`

**Props:**
```typescript
interface RepoRowProps {
  repo: Repo;
  variant?: 'default' | 'selectable' | 'manageable';
  selected?: boolean;
  onSelect?: () => void;
  onRemove?: () => void;
}
```

**Used in:** Home, New Project flow, Manage Repos, Knowledge panel Repos tab.

---
### RepoDropZone

**Description:** Dashed-border drop target with an "Add Repository" button — accepts folder drops or click-to-pick.

**States:** `idle` | `drag-over` | `validating` | `error`

**Props:**
```typescript
interface RepoDropZoneProps {
  onAdd: (paths: string[]) => Promise<void>;
  error?: string;
}
```

**Used in:** New Project flow (step 2).

---
### BranchTag

**Description:** Read-only mono-fonted pill displaying a git branch with a branch icon. Used wherever a repo's current branch is shown but not interactive.

**Props:**
```typescript
interface BranchTagProps {
  branch: string;
  size?: 'xs' | 'sm';
}
```

**Used in:** RepoRow, Home, Manage Repos.

---

## Sessions

---
### SessionHistoryPanel

**Description:** Sidebar listing all sessions for a project, with a search field and "new session" button.

**Props:**
```typescript
interface SessionHistoryPanelProps {
  projectId: string;
  selectedSessionId?: string;
  onSelectSession: (id: string) => void;
  onNewSession: () => void;
}
```

**Used in:** ChatWindow (when `showSessionsSidebar`).

---
### SessionHistoryItem

**Description:** Single row in the sessions panel — name, excerpt of last message, RoleBadge, timestamp.

**States:** `default` | `hover` | `selected`

**Props:**
```typescript
interface SessionHistoryItemProps {
  session: { id: string; name: string; excerpt: string; role: Role; date: string };
  selected?: boolean;
  onClick?: () => void;
}
```

**Used in:** SessionHistoryPanel.

---

## Indicators

---
### Spinner

**Description:** Small rotating-arc loading indicator. Inherits color via `currentColor`.

**Props:**
```typescript
interface SpinnerProps { size?: number; }
```

**Used in:** Sign-in, BranchSelector loading state, ChatInput disabled state.

---
### ProgressBar

**Description:** Linear determinate/indeterminate progress bar.

**Variants:** `determinate` | `indeterminate`

**Props:**
```typescript
interface ProgressBarProps {
  value?: number;        // 0-1; omitted → indeterminate
  variant?: 'default' | 'success' | 'warning' | 'error';
}
```

**Used in:** Future: long-running checkout, file indexing.

---
### StatusIndicator

**Description:** Tiny circle / dot used inline to express a state — colored fill, optional pulse.

**Variants:** `idle` | `active` (pulses) | `done` | `error`

**Props:**
```typescript
interface StatusIndicatorProps {
  state: 'idle' | 'active' | 'done' | 'error';
  color?: string;        // override; defaults to semantic color
  size?: number;
}
```

**Used in:** AgentMetaLabel, contributor pill rows, future status surfaces.

---
### Avatar

**Description:** Small circular identifier — initials over a colored background (one shade per role for agents).

**Props:**
```typescript
interface AvatarProps {
  name: string;
  role?: Role;          // colors avatar from role palette
  size?: 'xs' | 'sm' | 'md';
}
```

**Used in:** Future: contributor avatars in dense agent rows.

---

## Logo

---
### Logo

**Description:** Agent 42 wordmark / glyph. Variant determines visual treatment.

**Variants:** `numeric` (default — `42` glyph in tinted square) | `orbit` | `hex` | `wordmark`

**Props:**
```typescript
interface LogoProps {
  variant?: 'numeric' | 'orbit' | 'hex' | 'wordmark';
  size?: number;
  accent?: string;
}
```

**Used in:** Sign-in, Home sidebar header.

---

## Shared types referenced above

```typescript
type AgentName =
  | 'architect' | 'analyst' | 'developer' | 'devops'
  | 'qa-lead' | 'tester' | 'automation' | 'db-expert'
  | 'security' | 'tech-writer';

interface Repo {
  id: string;
  name: string;
  path: string;
  branch: string;
}

interface Attachment {
  id: string;
  kind: 'file' | 'snippet';
  filename: string;
  lineRange?: [number, number];
}

interface Message {
  id: string;
  kind: 'user' | 'agent';
  // ... see UserMessage / AgentMessage props
}
```

---

## Screen states NOT yet covered by mockups

The following states/screens would benefit from additional mockups before
handoff. Capture each as its own screenshot.

### Empty states
- [ ] Home — first run, no projects yet (just the "New Project" CTA)
- [ ] Sessions panel — no sessions in project yet
- [ ] Knowledge panel: Learnings tab — empty
- [ ] Knowledge panel: Decisions tab — empty
- [ ] Manage Repos — zero repos (drop zone occupies full panel)
- [ ] Search results in Sessions panel — no matches

### Dropdown / popover states (open)
- [ ] BranchSelector — open menu showing branches with search filter
- [ ] BranchSelector — open menu in collapsed mode (Branches button → list of all repos)
- [ ] RoleSelector — open menu showing all 10 roles with active highlight
- [ ] Project sidebar item — context menu (rename / delete)
- [ ] Session item — context menu (rename / delete / duplicate)
- [ ] Repo row — overflow menu (open in Finder / VS Code)

### Loading & async states
- [ ] Sign-in — `connecting` mid-state (browser opened, waiting on callback)
- [ ] New Project step 2 — folder drop being validated (spinner before success/error)
- [ ] ChatInput — disabled while last message is streaming
- [ ] Sessions panel — search debouncing
- [ ] Knowledge panel — initial load skeleton

### Error states
- [ ] Sign-in — Copilot subscription invalid / `gh` CLI missing
- [ ] New Project — drop zone with **dirty working tree** error (different from the "not a git repo" error)
- [ ] Manage Repos — repo path no longer exists on disk
- [ ] Chat — agent error response (timeout / API failure)
- [ ] BranchSelector — checkout failed (uncommitted changes)
- [ ] BranchSelector — branch not present locally (offer to fetch)

### Hover & focus states
- [ ] All button variants — hover and focus rings
- [ ] SidebarItem — hover (vs selected)
- [ ] RepoRow — hover with reveal of overflow icon
- [ ] AgentMessage action buttons — hover with tooltip
- [ ] BranchTag — hover state if it's clickable in chat header

### Streaming variants
- [ ] Two agents streaming concurrently (parallel work)
- [ ] Agent message with **partial** body + cursor + still-streaming indicator
- [ ] Streaming cancelled mid-flight

### Modal & dialog states
- [ ] New Session modal (if launched from a button vs the "+" sidebar action)
- [ ] Settings modal — Copilot account, theme, keybindings
- [ ] Branch checkout confirmation when working tree is dirty
- [ ] Knowledge entry edit modal (long-form editing of a learning)

### Density & font tweaks
- [ ] Compact density variant of chat window for dense reviewers
- [ ] Mono-font tweak applied across home (already exposed via Tweaks but not screenshotted)

### Multi-window
- [ ] Two chat windows open side-by-side (each its own native window)
- [ ] Notification when a background agent finishes in an unfocused window

### Onboarding / first-run
- [ ] Sign-in step transitioning to Home (first-run: no projects → guided New Project flow)
- [ ] Tooltips / coach marks pointing at branch selector + role selector on first chat

### Keyboard / command surfaces
- [ ] Command palette (⌘K) — likely needed for power-user flows
- [ ] Keyboard shortcut cheatsheet overlay
