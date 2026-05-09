# Agent 42

> A desktop app for conversing with your codebase using GitHub Copilot and Squad AI agents.

## What is Agent 42?

Agent 42 is a native desktop application that lets developers and technical team members have intelligent, role-aware conversations with multi-repository codebases. It uses GitHub Copilot as the AI engine and Squad (`@bradygaster/squad-sdk`) as the agent orchestration layer, giving every user a team of specialized AI agents that learn and remember the codebase across sessions.

## Design Documents

DocumentDescription01 — Product OverviewVision, goals, target users, and key principles02 — UI DescriptionScreen-by-screen interface description for designers03 — User FlowsEnd-to-end user journeys and interaction flows04 — Technical ArchitectureSystem architecture, components, and communication05 — Tech StackTechnology choices and rationale06 — Squad IntegrationHow Squad SDK is used for agent orchestration07 — Auth StrategyGitHub Copilot, GitHub, and GitLab authentication08 — Repo ManagementClone strategy, worktrees, branch handling, and sync09 — Data ModelsCore data structures: projects, sessions, repos, agents

## Status

> MVP foundation in progress — Tauri + React shell and first UI frames are now in-repo.

## Local development

```bash
npm install
npm run dev
```

Rust shell check:

```bash
cargo check --manifest-path src-tauri/Cargo.toml
```
