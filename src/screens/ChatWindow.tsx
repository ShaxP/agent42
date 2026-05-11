import { useEffect, useMemo, useState } from 'react';
import { ChatHeader } from '../components/chat/ChatHeader';
import { ChatInput } from '../components/chat/ChatInput';
import { MessageList } from '../components/chat/MessageList';
import { KnowledgePanel } from '../components/knowledge/KnowledgePanel';
import { SessionHistoryPanel } from '../components/sessions/SessionHistoryPanel';
import {
  checkoutBranch,
  createSession,
  getCurrentBranch,
  getSessionMessages,
  getSessionList,
  hasTauriRuntime,
  listBranches,
  onAgentStatus,
  onBranchChanged,
  onResponseChunk,
  onResponseDone,
  sendMessage
} from '../lib/tauri';
import { useSessionsStore } from '../store/sessions';
import type { Project, Role, SessionSummary } from '../types';

const fallbackRole: Role = 'Developer';

function safeRole(role: string): Role {
  const allowed: Role[] = [
    'Architect',
    'Business Analyst',
    'Developer',
    'DevOps Engineer',
    'QA Lead',
    'Tester',
    'Test Automation Expert',
    'DB Expert',
    'Security Reviewer',
    'Technical Writer'
  ];

  return allowed.includes(role as Role) ? (role as Role) : fallbackRole;
}

interface ChatWindowProps {
  project: Project;
}

export function ChatWindow({ project }: ChatWindowProps) {
  const {
    sessionId,
    sessionName,
    activeRole,
    branchMap,
    messages,
    draft,
    attachments,
    sessions,
    selectedSessionId,
    streaming,
    activeAgents,
    activeStatusDetails,
    knowledgePanelOpen,
    sessionsPanelOpen,
    hydrateSession,
    setActiveRole,
    setSessionName,
    setBranch,
    setDraft,
    addAttachment,
    removeAttachment,
    clearComposer,
    addUserMessage,
    startStreaming,
    appendStreamingChunk,
    finishStreaming,
    setActiveAgents,
    pushActiveStatusDetail,
    clearActiveStatusDetails,
    setMessages,
    setSessions,
    setSelectedSession,
    toggleKnowledgePanel,
    toggleSessionsPanel
  } = useSessionsStore();

  const [branchOptions, setBranchOptions] = useState<Record<string, string[]>>({});
  const [pendingRepoId, setPendingRepoId] = useState<string | undefined>();
  const [activeRepoId, setActiveRepoId] = useState<string | undefined>(project.repos[0]?.id);

  useEffect(() => {
    const firstSession = project.sessions[0];
    const initialSession: SessionSummary =
      firstSession ??
      ({
        id: `session-${project.id}`,
        name: 'New Session',
        role: 'Developer',
        updatedAt: Date.now(),
        excerpt: 'Session created'
      } satisfies SessionSummary);

    hydrateSession({
      projectId: project.id,
      sessionId: initialSession.id,
      sessionName: initialSession.name,
      repos: project.repos,
      role: safeRole(initialSession.role)
    });
    setSessions(project.sessions);
    setSelectedSession(initialSession.id);
    setBranchOptions({});
    setPendingRepoId(undefined);
    setActiveRepoId(project.repos[0]?.id);
  }, [hydrateSession, project, setSelectedSession, setSessions]);

  useEffect(() => {
    let mounted = true;

    void (async () => {
      const remoteSessions = await getSessionList(project.id);
      if (!mounted) {
        return;
      }

      let nextSessions = remoteSessions.length > 0 ? remoteSessions : project.sessions;
      if (nextSessions.length === 0 && hasTauriRuntime()) {
        const created = await createSession(project.id, fallbackRole, 'New Session');
        if (!mounted) {
          return;
        }
        nextSessions = [created];
      }

      setSessions(nextSessions);
      const activeSession = nextSessions[0];
      if (activeSession) {
        setSelectedSession(activeSession.id);
        hydrateSession({
          projectId: project.id,
          sessionId: activeSession.id,
          sessionName: activeSession.name,
          repos: project.repos,
          role: safeRole(activeSession.role)
        });
      }
    })();

    return () => {
      mounted = false;
    };
  }, [hydrateSession, project.id, project.repos, project.sessions, setSelectedSession, setSessions]);

  useEffect(() => {
    let active = true;

    const unsubscribers: Array<() => void> = [];

    void (async () => {
      const [unlistenChunk, unlistenDone, unlistenAgents, unlistenBranch] = await Promise.all([
        onResponseChunk((event) => {
          if (event.sessionId === sessionId) {
            appendStreamingChunk(event.chunk);
          }
        }),
        onResponseDone((event) => {
          if (event.sessionId === sessionId) {
            finishStreaming(event.agentsMeta);
          }
        }),
        onAgentStatus((event) => {
          if (event.sessionId === sessionId) {
            setActiveAgents(event.agents);
            if (event.status === 'running') {
              pushActiveStatusDetail(event.detail ?? null);
            } else {
              clearActiveStatusDetails();
            }
          }
        }),
        onBranchChanged((event) => {
          if (event.sessionId === sessionId) {
            setBranch(event.repoId, event.branch);
          }
        })
      ]);

      unsubscribers.push(unlistenChunk, unlistenDone, unlistenAgents, unlistenBranch);

      if (!active) {
        unsubscribers.forEach((unsubscribe) => unsubscribe());
        unsubscribers.length = 0;
      }
    })();

    return () => {
      active = false;
      unsubscribers.forEach((unsubscribe) => unsubscribe());
    };
  }, [appendStreamingChunk, clearActiveStatusDetails, finishStreaming, pushActiveStatusDetail, sessionId, setActiveAgents, setBranch]);

  useEffect(() => {
    let mounted = true;

    void (async () => {
      const loaded = await getSessionMessages(sessionId);
      if (!mounted) {
        return;
      }
      setMessages(loaded);
    })();

    return () => {
      mounted = false;
    };
  }, [sessionId, setMessages]);

  const ensureBranchOptions = async (repoId: string) => {
    if (branchOptions[repoId]?.length) {
      return;
    }

    const [branches, currentBranch] = await Promise.all([listBranches(project.id, repoId), getCurrentBranch(repoId)]);

    setBranchOptions((state) => ({
      ...state,
      [repoId]: branches.length > 0 ? branches : [currentBranch]
    }));

    if (currentBranch) {
      setBranch(repoId, currentBranch);
    }
  };

  const handleCheckout = async (repoId: string, branch: string) => {
    setPendingRepoId(repoId);

    try {
      await checkoutBranch(sessionId, repoId, branch);
      setBranch(repoId, branch);
      setActiveRepoId(repoId);
    } finally {
      setPendingRepoId(undefined);
    }
  };

  const handleSubmit = () => {
    const content = draft.trim();
    if (!content || streaming) {
      return;
    }

    addUserMessage(content);
    clearComposer();
    startStreaming();
    setActiveAgents([activeRole]);
    clearActiveStatusDetails();

    if (hasTauriRuntime()) {
      void sendMessage({
        sessionId,
        message: content,
        role: activeRole,
        projectId: project.id,
        repoId: activeRepoId,
        branchMap
      });

      return;
    }

    window.setTimeout(() => {
      appendStreamingChunk('Backend wiring is pending. This is a placeholder-safe streamed response from the UI layer.');
      finishStreaming({ agents: [activeRole], userRole: activeRole, tier: 'direct' });
    }, 450);
  };

  const branchSummary = useMemo(() => {
    return project.repos
      .map((repo) => {
        const branch = branchMap[repo.id] ?? repo.lastBranchRead;
        return `${repo.name}:${branch}`;
      })
      .join(' · ');
  }, [branchMap, project.repos]);

  const handleSelectSession = (id: string) => {
    setSelectedSession(id);
    const selected = sessions.find((session) => session.id === id);
    if (selected) {
      hydrateSession({
        projectId: project.id,
        sessionId: selected.id,
        sessionName: selected.name,
        repos: project.repos,
        role: safeRole(selected.role)
      });
    }
  };

  const handleNewSession = async () => {
    const created = await createSession(project.id, activeRole, 'New Session');
    const nextSessions = [created, ...sessions.filter((session) => session.id !== created.id)];
    setSessions(nextSessions);
    setSelectedSession(created.id);
    hydrateSession({
      projectId: project.id,
      sessionId: created.id,
      sessionName: created.name,
      repos: project.repos,
      role: safeRole(created.role)
    });
  };

  return (
    <section className="relative flex h-full min-h-[560px] overflow-hidden rounded-md border border-borderDefault bg-bgSurface">
      <div className="flex min-w-0 flex-1 flex-col">
        <ChatHeader
          projectName={project.name}
          sessionName={sessionName}
          repos={project.repos}
          activeRole={activeRole}
          branchMap={branchMap}
          branchOptions={branchOptions}
          pendingRepoId={pendingRepoId}
          sessionsOpen={sessionsPanelOpen}
          knowledgeOpen={knowledgePanelOpen}
          onRoleChange={setActiveRole}
          onSessionNameChange={setSessionName}
          onToggleKnowledge={toggleKnowledgePanel}
          onToggleSessions={toggleSessionsPanel}
          onCheckout={handleCheckout}
          onOpenRepoBranches={(repoId) => {
            void ensureBranchOptions(repoId);
          }}
        />

        <MessageList
          messages={messages}
          streaming={streaming}
          activeAgents={activeAgents}
          activeRole={activeRole}
          activeStatusDetails={activeStatusDetails}
        />

        <ChatInput
          value={draft}
          onChange={setDraft}
          attachments={attachments}
          onAddAttachment={() => addAttachment({ id: `${Date.now()}`, label: 'context-snippet.ts' })}
          onRemoveAttachment={removeAttachment}
          onSubmit={handleSubmit}
          disabled={streaming}
          activeRole={activeRole}
          branchSummary={branchSummary || 'No repositories connected'}
        />
      </div>

      {knowledgePanelOpen ? (
        <KnowledgePanel projectId={project.id} repos={project.repos} branchMap={branchMap} onClose={toggleKnowledgePanel} />
      ) : null}

      {sessionsPanelOpen ? (
        <SessionHistoryPanel
            projectId={project.id}
            sessions={sessions}
            selectedSessionId={selectedSessionId ?? sessionId}
            onSelectSession={handleSelectSession}
            onNewSession={handleNewSession}
            onClose={toggleSessionsPanel}
          />
      ) : null}
    </section>
  );
}
