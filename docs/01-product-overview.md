# 01 — Product Overview

## Vision

Agent 42 is a native desktop application that gives every member of a software development team — regardless of role — the ability to have intelligent, context-aware conversations with their codebase. Rather than manually navigating code, documentation, and tribal knowledge, users ask questions in natural language and receive answers shaped by their role and grounded in the actual source code.

## The Problem

Modern software solutions span multiple repositories, multiple disciplines, and multiple team members. Getting answers about how the system works requires either deep personal familiarity with the codebase, or interrupting a colleague. Tools like GitHub Copilot help individual developers, but they are optimised for code completion inside an editor — not for broad architectural questions, cross-repo analysis, tech debt discovery, or the kind of questions a QA lead, business analyst, or architect needs answered on a daily basis.

## The Solution

Agent 42 wraps GitHub Copilot and the Squad agent orchestration framework in a purpose-built desktop experience. The user connects their repos, picks a role, and starts a conversation. Behind the scenes, a coordinated team of AI agents routes the question to the right specialist, runs analysis in parallel where needed, and returns a synthesised answer. Every answer the agents give is remembered — the knowledge base grows with every session, so the app gets smarter the more the team uses it.

## Target Users

Agent 42 is built for all roles in a software development team working on a multi-repository solution:

- **Architect** — system structure, boundaries, ADRs, cross-service dependencies
- **Business Analyst** — domain logic, feature intent, requirements traceability
- **Developer** — implementation details, patterns, refactoring opportunities, code explanation
- **DevOps Engineer** — pipelines, infrastructure-as-code, deployment topology
- **QA Lead** — quality coverage, risk areas, testing strategy
- **Tester** — specific test cases, bug reproduction, edge case identification
- **Test Automation Expert** — framework usage, automation gaps, flaky test analysis
- **DB Expert** — schema design, query performance, migration risks
- **Security Reviewer** — vulnerabilities, auth patterns, secrets hygiene
- **Technical Writer** — documentation gaps, API contracts, onboarding clarity

## Key Principles

**Local-first.** The app works entirely against repositories the user already has cloned on their machine. No code leaves the machine except via the user's own authenticated Copilot connection. The app never clones, fetches, or manages remote repositories on the user's behalf.

**Bring your own repos.** Target users are developers and software engineers who already use git clients, have repositories cloned locally, and manage their own branches. The app is an overlay on their existing workflow — not a repo manager.

**Single authentication.** The only external authentication required is GitHub Copilot, which the user connects once using their own GitHub account and Copilot seat. There is no GitHub API integration, no GitLab integration, and no shared service account in v1.

**Role-aware answers.** The user's chosen role is passed as context to the Squad coordinator on every message. The same question asked by an architect and a tester will produce structurally different, role-appropriate answers.

**Knowledge compounds.** Agent learnings are stored in a project-level `.squad/` folder. Every chat session contributes to the knowledge base. The more the team uses it, the more the agents know about the specific codebase.

**Multi-repo aware.** A project is a collection of repositories that belong to the same solution. Agents can reason across repo boundaries — correlating a frontend change with its backend API, or tracing a schema migration to the service that owns it.

**Branch aware.** Each chat window tracks its own branch state per repo. The user can switch branches via a dropdown or by asking the agent in natural language. Different chat windows can be on different branches simultaneously.

**No lock-in.** The Squad knowledge base can be exported and shared with teammates. Individual repos are standard git clones. Nothing proprietary is written into the repos themselves.

## Success Criteria

- A developer can open a chat window and get a meaningful answer about an unfamiliar part of the codebase in under 60 seconds.
- An architect can ask "what are the cross-service dependencies in this solution?" and receive an accurate, structured answer without manually reading code.
- A QA lead can ask "where are the highest-risk areas for regression in the last sprint's changes?" and get an answer grounded in actual diff and test coverage data.
- Agent answers visibly improve over the first five sessions on a project as the knowledge base accumulates context.
- The app feels native, fast, and focused — not like a browser wrapped in a desktop shell.
