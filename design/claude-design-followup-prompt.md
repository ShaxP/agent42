# Claude Design Follow-up Prompt
# Paste this into Claude Design after the mockups are complete.
# Run it as a single message. It will produce three artifacts you save to design/.
# ─────────────────────────────────────────────────────────────────────────────

Now that the mockups are complete, I need you to produce three structured
artifacts that my AI coding agent will use to build the app. Please generate
all three in sequence, as separate clearly labelled artifacts.

---

## Artifact 1 — tokens.css

A complete CSS custom properties file covering every design decision visible in
the mockups. Structure it exactly as shown below. Fill in the actual values from
the design — do not use placeholders.

```css
/* Agent 42 — Design Tokens */
:root {

  /* ── Colour: Base palette ── */
  --color-bg-base:           ;  /* main window background */
  --color-bg-surface:        ;  /* card / panel background */
  --color-bg-elevated:       ;  /* dropdowns, modals */
  --color-bg-subtle:         ;  /* hover states, input backgrounds */

  /* ── Colour: Border ── */
  --color-border-default:    ;
  --color-border-subtle:     ;
  --color-border-strong:     ;

  /* ── Colour: Text ── */
  --color-text-primary:      ;
  --color-text-secondary:    ;
  --color-text-tertiary:     ;
  --color-text-disabled:     ;
  --color-text-inverse:      ;

  /* ── Colour: Brand / Interactive ── */
  --color-accent:            ;  /* primary action colour */
  --color-accent-hover:      ;
  --color-accent-subtle:     ;  /* accent at low opacity, for backgrounds */

  /* ── Colour: Semantic ── */
  --color-success:           ;
  --color-success-subtle:    ;
  --color-warning:           ;
  --color-warning-subtle:    ;
  --color-error:             ;
  --color-error-subtle:      ;

  /* ── Colour: Role badges ── */
  /* One background + foreground pair per role */
  --color-role-architect-bg:          ;
  --color-role-architect-fg:          ;
  --color-role-analyst-bg:            ;
  --color-role-analyst-fg:            ;
  --color-role-developer-bg:          ;
  --color-role-developer-fg:          ;
  --color-role-devops-bg:             ;
  --color-role-devops-fg:             ;
  --color-role-qa-lead-bg:            ;
  --color-role-qa-lead-fg:            ;
  --color-role-tester-bg:             ;
  --color-role-tester-fg:             ;
  --color-role-automation-bg:         ;
  --color-role-automation-fg:         ;
  --color-role-db-expert-bg:          ;
  --color-role-db-expert-fg:          ;
  --color-role-security-bg:           ;
  --color-role-security-fg:           ;
  --color-role-tech-writer-bg:        ;
  --color-role-tech-writer-fg:        ;

  /* ── Typography ── */
  --font-family-base:        ;  /* system font stack */
  --font-family-mono:        ;  /* monospace, for code and paths */

  --font-size-xs:            ;  /* e.g. 11px */
  --font-size-sm:            ;  /* e.g. 12px */
  --font-size-base:          ;  /* e.g. 13px — main UI text */
  --font-size-md:            ;  /* e.g. 14px */
  --font-size-lg:            ;  /* e.g. 16px */
  --font-size-xl:            ;  /* e.g. 20px — headings */

  --font-weight-normal:      400;
  --font-weight-medium:      500;
  --font-weight-semibold:    600;

  --line-height-tight:       ;
  --line-height-base:        ;
  --line-height-relaxed:     ;

  /* ── Spacing scale ── */
  --space-1:   ;  /* 4px */
  --space-2:   ;  /* 8px */
  --space-3:   ;  /* 12px */
  --space-4:   ;  /* 16px */
  --space-5:   ;  /* 20px */
  --space-6:   ;  /* 24px */
  --space-8:   ;  /* 32px */
  --space-10:  ;  /* 40px */
  --space-12:  ;  /* 48px */

  /* ── Sizing ── */
  --sidebar-width:           ;  /* left nav sidebar */
  --knowledge-panel-width:   ;  /* chat window right sidebar */
  --chat-input-max-height:   ;  /* max height before scrolling internally */
  --header-height:           ;  /* chat window header bar */

  /* ── Border radius ── */
  --radius-sm:   ;  /* inputs, small chips */
  --radius-md:   ;  /* cards, panels */
  --radius-lg:   ;  /* modals */
  --radius-full: ;  /* badges, avatars */

  /* ── Shadows ── */
  --shadow-sm:   ;  /* subtle lift */
  --shadow-md:   ;  /* dropdowns, popovers */
  --shadow-lg:   ;  /* modals */

  /* ── Transitions ── */
  --transition-fast:    150ms ease;
  --transition-base:    200ms ease;
  --transition-slow:    300ms ease;
}
```

---

## Artifact 2 — tokens.json

The same values as tokens.css, expressed as a flat JSON object for TypeScript
consumption. Keys use camelCase. Example structure:

```json
{
  "color": {
    "bgBase": "#...",
    "bgSurface": "#...",
    "textPrimary": "#...",
    "accent": "#...",
    "role": {
      "architect": { "bg": "#...", "fg": "#..." },
      "analyst":   { "bg": "#...", "fg": "#..." }
    }
  },
  "font": {
    "familyBase": "...",
    "familyMono": "...",
    "sizeBase": "13px"
  },
  "space": {
    "1": "4px",
    "2": "8px"
  },
  "radius": {
    "sm": "...",
    "md": "..."
  }
}
```

Fill in all values to match the design.

---

## Artifact 3 — component-inventory.md

A complete inventory of every reusable UI component visible in the mockups.
For each component, provide:

- **Component name** (PascalCase, this becomes the filename)
- **Description** — one sentence
- **Variants** — list of visual variants (e.g. primary, secondary, ghost)
- **States** — list of interactive states (e.g. default, hover, active, disabled, loading)
- **Props** — key props with TypeScript types
- **Used in** — which screens use this component

Format each component like this:

---
### ComponentName

**Description:** One sentence.

**Variants:** `primary` | `secondary` | `ghost`

**States:** `default` | `hover` | `active` | `disabled`

**Props:**
```typescript
interface ComponentNameProps {
  variant?: 'primary' | 'secondary' | 'ghost';
  disabled?: boolean;
  onClick?: () => void;
  children: React.ReactNode;
}
```

**Used in:** Sign-in, Home, Chat window
---

Cover all components including but not limited to:
Button, Badge (generic), RoleBadge, Input, TextArea, Dropdown, SearchableDropdown,
Modal, ConfirmationModal, Tabs, TabPanel, Sidebar, SidebarItem, ProjectItem,
ChatWindow (shell), ChatHeader, BranchSelector, RoleSelector, SessionNameEditor,
MessageList, UserMessage, AgentMessage, AgentMetaLabel, CodeBlock, AttachmentChip,
StreamingIndicator, AgentStatusLine, ChatInput, KnowledgePanel, LearningsTab,
DecisionsTab, ReposTab, KnowledgeEntry, RepoRow, SessionHistoryPanel,
SessionHistoryItem, ProgressBar, StatusIndicator, EmptyState, Banner.

---

## After generating all three artifacts

Please also list every screen state that is **not** covered by the main mockups
and would benefit from an additional mockup — for example open dropdown states,
empty states, error states, or loading states. Format this as a simple checklist
so I know what additional screenshots to capture before handing off to the
coding agent.
