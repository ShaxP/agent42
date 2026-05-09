# 09 — Data Models

## Overview

Agent 42 has two storage layers:
- **SQLite (`app.db`)** — structured app-level state: projects, repos, sessions, settings
- **File system** — conversation history (JSON), Squad state (`.squad/` markdown files)

---

## SQLite Schema

### Table: `projects`

```sql
CREATE TABLE projects (
  id           TEXT PRIMARY KEY,        -- UUID
  name         TEXT NOT NULL,
  squad_path   TEXT NOT NULL,           -- absolute path to .squad/ folder
  created_at   INTEGER NOT NULL,        -- unix timestamp
  updated_at   INTEGER NOT NULL
);
```

### Table: `repos`

```sql
CREATE TABLE repos (
  id               TEXT PRIMARY KEY,    -- UUID
  project_id       TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name             TEXT NOT NULL,       -- display name, detected from folder name
  local_path       TEXT NOT NULL,       -- absolute path to user's existing local clone
  last_branch_read TEXT NOT NULL        -- last branch read from HEAD (refreshed on each message)
);
```

### Table: `sessions`

```sql
CREATE TABLE sessions (
  id             TEXT PRIMARY KEY,      -- UUID
  project_id     TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name           TEXT NOT NULL,         -- editable by user; defaults to first message excerpt
  role           TEXT NOT NULL,         -- last active role in this session
  branch_map     TEXT NOT NULL,         -- JSON: { [repo_id]: branch_name }
  created_at     INTEGER NOT NULL,
  updated_at     INTEGER NOT NULL,
  history_path   TEXT NOT NULL          -- absolute path to messages JSON file
);
```

### Table: `settings`

```sql
CREATE TABLE settings (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL                   -- JSON-encoded value
);
```

Example settings keys:
- `auth.copilot.status` — `'authenticated' | 'unauthenticated' | 'expired'`
- `llm.fallback_provider` — `'claude' | 'azure-openai' | null` (v2)

---

## File System Models

### Session conversation history

Stored at `{app-data}/projects/{project-id}/sessions/{session-id}/messages.json`

```typescript
interface MessageFile {
  session_id: string;
  messages:   Message[];
}

interface Message {
  id:           string;          // UUID
  role:         'user' | 'agent';
  content:      string;          // markdown text
  timestamp:    number;          // unix ms
  agents_meta?: AgentsMeta;      // only on agent messages
  attachment?:  Attachment;      // only on user messages with attached context
}

interface AgentsMeta {
  agents:    string[];           // e.g. ['architect', 'security']
  user_role: string;             // role active at time of message
  tier:      string;             // Squad tier: 'direct' | 'standard' | 'full'
}

interface Attachment {
  type:     'file' | 'snippet';
  label:    string;              // display name
  content:  string;              // file contents or pasted snippet
  repo_id?: string;              // if from a project repo
  path?:    string;              // relative path within repo
}
```

### Squad state files (managed by Squad SDK)

Written and read by the Squad SDK. Agent 42 reads them for the knowledge panel but does not write to them directly.

```
{app-data}/projects/{project-id}/.squad/
  team.md                        ← team roster
  routing.md                     ← routing rules
  decisions.md                   ← all decisions recorded by agents
  agents/
    {agent-name}/
      charter.md                 ← agent identity and expertise
      history.md                 ← accumulated learnings about this project
  skills/                        ← compressed learnings
  log/                           ← session history archive
```

---

## In-Memory Models (Sidecar)

```typescript
// Active sessions
const sessions   = new Map<string, SquadSession>();
const branchMaps = new Map<string, Record<string, string>>();
// key: session_id, value: { [repo_id]: branch_name }

// One coordinator per project, shared across all sessions in that project
const coordinators = new Map<string, SquadCoordinator>();
// key: project_id
```

---

## In-Memory Models (React frontend — Zustand)

```typescript
interface AuthState {
  copilot: AuthStatus;
}

type AuthStatus = 'authenticated' | 'unauthenticated' | 'expired' | 'checking';

interface ProjectState {
  projects: Project[];
  selected: string | null;
}

interface Project {
  id:       string;
  name:     string;
  repos:    Repo[];
  sessions: SessionSummary[];
}

interface Repo {
  id:              string;
  name:            string;
  localPath:       string;
  lastBranchRead:  string;
}

interface SessionSummary {
  id:        string;
  name:      string;
  role:      string;
  updatedAt: number;
  excerpt:   string;
}

interface ChatWindowState {
  sessionId:    string;
  projectId:    string;
  role:         Role;
  branchMap:    Record<string, string>;  // repo_id → current branch
  messages:     Message[];
  streaming:    boolean;
  activeAgents: string[];               // agents currently responding
}

type Role =
  | 'Architect'
  | 'Business Analyst'
  | 'Developer'
  | 'DevOps Engineer'
  | 'QA Lead'
  | 'Tester'
  | 'Test Automation Expert'
  | 'DB Expert'
  | 'Security Reviewer'
  | 'Technical Writer';
```
