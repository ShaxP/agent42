# 06 — Squad Integration

## Overview

Agent 42 uses the `@bradygaster/squad-sdk` (alpha) as its agent orchestration layer. Squad provides routing, parallel execution, agent memory, and decision logging. The Node.js sidecar is the exclusive host of all Squad SDK usage.

> ⚠️ Squad is alpha software. Pin to a specific npm version in package.json and review the changelog before upgrading.

---

## Project Initialisation

When the user creates a new project and all repos have been cloned, the sidecar runs Squad initialisation once:

```typescript
import { ensureSquadPath, loadConfig } from '@bradygaster/squad-sdk';

const squadPath = ensureSquadPath(projectPath); // creates .squad/ if missing
```

This creates the `.squad/` folder structure at the project level. No individual repo is modified.

---

## Agent Team Configuration

A `squad.config.ts` is generated per project when it is created. It defines the full codebase analysis team:

```typescript
import { defineSquad, defineTeam, defineAgent, defineRouting } from '@bradygaster/squad-sdk';

export default defineSquad({
  team: defineTeam({
    name: 'Agent 42 Team',
    projectContext: 'Multi-repo codebase analysis and Q&A',
  }),
  agents: [
    defineAgent({ name: 'architect',     role: 'System architecture, boundaries, ADRs, cross-repo dependencies' }),
    defineAgent({ name: 'analyst',       role: 'Domain logic, feature intent, requirements traceability' }),
    defineAgent({ name: 'developer',     role: 'Implementation details, code patterns, refactoring' }),
    defineAgent({ name: 'devops',        role: 'Pipelines, infrastructure-as-code, deployment topology' }),
    defineAgent({ name: 'qa-lead',       role: 'Quality coverage, risk areas, testing strategy' }),
    defineAgent({ name: 'tester',        role: 'Test cases, bug reproduction, edge cases' }),
    defineAgent({ name: 'automation',    role: 'Test automation frameworks, gaps, flaky test analysis' }),
    defineAgent({ name: 'db-expert',     role: 'Schema design, query performance, migration risks' }),
    defineAgent({ name: 'security',      role: 'Vulnerabilities, auth patterns, secrets hygiene' }),
    defineAgent({ name: 'tech-writer',   role: 'Documentation gaps, API contracts, onboarding clarity' }),
  ],
  routing: defineRouting({
    fallback: 'coordinator',
  }),
  models: {
    default: 'claude-sonnet-4',
    fallbackChains: {
      premium:  ['claude-opus-4', 'gpt-4.1'],
      standard: ['claude-sonnet-4', 'gpt-4.1'],
      fast:     ['claude-haiku-4.5', 'gpt-4.1-mini'],
    },
  },
});
```

The coordinator selects which agents to involve per prompt. The user's chosen role is injected as context, not as an agent selector — it shapes how agents frame their responses rather than restricting which agents respond.

---

## Session Lifecycle

Each open chat window corresponds to one Squad session. Sessions are managed by `SquadClientWithPool`.

```typescript
import { SquadClientWithPool, SquadCoordinator } from '@bradygaster/squad-sdk';

// On app start
const squad = new SquadClientWithPool({
  client: { port: 3000, auth: { token: process.env.COPILOT_TOKEN } },
  pool:   { maxConcurrent: 10, idleTimeout: 60_000 },
});

// On 'init_session' IPC message
const session = await squad.createSession({ agent: 'coordinator' });
sessions.set(sessionId, session);

// On 'close_session' IPC message
await session.destroy();
sessions.delete(sessionId);
worktrees.prune(sessionId); // handled by Tauri shell via IPC
```

---

## Routing and Execution

When a message arrives for a session:

```typescript
import { SquadCoordinator } from '@bradygaster/squad-sdk';

const coordinator = new SquadCoordinator({
  teamRoot: projectSquadPath,
  enableParallel: true,
});
await coordinator.initialize();

// On each message
const enrichedPrompt = buildPrompt(message, role, branchMap, repoContext);
const decision = await coordinator.route(enrichedPrompt);
// decision.agents:   e.g. ['architect', 'security']
// decision.parallel: true
// decision.tier:     'standard'

await coordinator.execute(decision, enrichedPrompt);
```

The `buildPrompt` function prepends the user's role and branch context:

```typescript
function buildPrompt(message: string, role: string, branchMap: Record<string, string>, repos: string[]): string {
  return `
[User role: ${role}]
[Active branches: ${Object.entries(branchMap).map(([r, b]) => `${r}:${b}`).join(', ')}]
[Repos in scope: ${repos.join(', ')}]

${message}
  `.trim();
}
```

---

## Response Streaming

As the coordinator executes and agents respond, chunks are streamed back to the Tauri shell:

```typescript
squad.events.on('session.status_changed', (event) => {
  if (event.payload.status === 'active') {
    process.stdout.write(JSON.stringify({
      type: 'agent_status',
      sessionId,
      agents: decision.agents,
    }) + '\n');
  }
});

// Stream response chunks as they arrive
for await (const chunk of session.stream()) {
  process.stdout.write(JSON.stringify({
    type: 'response_chunk',
    sessionId,
    chunk,
  }) + '\n');
}

// On completion
process.stdout.write(JSON.stringify({
  type: 'response_done',
  sessionId,
  agentsMeta: { agents: decision.agents, role },
}) + '\n');
```

---

## Agent Memory and Knowledge Base

Agents write learnings automatically via the built-in `squad_memory` tool. No additional code is needed to trigger this — it happens as part of normal agent execution.

The knowledge panel in the UI reads directly from the `.squad/` folder:

```typescript
// On 'get_knowledge' IPC message
const historyFiles = glob(`${squadPath}/agents/*/history.md`);
const entries = historyFiles.flatMap(parseHistoryFile);
process.stdout.write(JSON.stringify({ type: 'knowledge_data', entries }) + '\n');

// On 'get_decisions' IPC message
const decisions = readFileSync(`${squadPath}/decisions.md`, 'utf-8');
process.stdout.write(JSON.stringify({ type: 'decisions_data', decisions }) + '\n');
```

---

## Branch Switch Notification

When the user switches branches, the sidecar updates the session context so the next coordinator call reflects the new branch:

```typescript
// On 'branch_changed' IPC message
const session = sessions.get(sessionId);
branchMaps.set(sessionId, { ...branchMaps.get(sessionId), [repoId]: branch });
// branchMap is injected into the next buildPrompt call
```

---

## Knowledge Export / Import

Exposed as CLI passthrough via the Squad CLI bundled in the sidecar:

```typescript
// Export
execSync(`squad export --output ${outputPath}`, { cwd: projectPath });

// Import
execSync(`squad import ${importFilePath}`, { cwd: projectPath });
```

Both are triggered from Tauri shell commands invoked by the UI.
