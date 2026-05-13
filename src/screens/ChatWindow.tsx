import { useEffect, useMemo, useRef, useState } from 'react';
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
  renameSession,
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
  initialSessionId?: string;
  onProjectSessionsChange?: (sessions: SessionSummary[]) => void;
  onClose?: () => void;
}

export function ChatWindow({ project, initialSessionId, onProjectSessionsChange, onClose }: ChatWindowProps) {
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
  const appliedInitialSessionIdRef = useRef<string | undefined>(undefined);

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

      const defaultSession: SessionSummary = {
        id: `session-${project.id}`,
        name: 'New Session',
        role: 'Developer',
        updatedAt: Date.now(),
        excerpt: 'Session created'
      };

      const activeSession =
        nextSessions.find((session) => session.id === initialSessionId) ??
        nextSessions[0] ??
        defaultSession;

      setSessions(nextSessions);
      setSelectedSession(activeSession.id);
      hydrateSession({
        projectId: project.id,
        sessionId: activeSession.id,
        sessionName: activeSession.name,
        repos: project.repos,
        role: safeRole(activeSession.role)
      });
      setBranchOptions({});
      setPendingRepoId(undefined);
      setActiveRepoId(project.repos[0]?.id);
    })();

    return () => {
      mounted = false;
    };
  }, [hydrateSession, initialSessionId, project.id, project.repos, setSelectedSession, setSessions]);

  useEffect(() => {
    if (!initialSessionId) {
      appliedInitialSessionIdRef.current = undefined;
      return;
    }
    if (appliedInitialSessionIdRef.current === initialSessionId) {
      return;
    }

    const selected = sessions.find((session) => session.id === initialSessionId);
    if (!selected) {
      return;
    }

    setSelectedSession(selected.id);
    hydrateSession({
      projectId: project.id,
      sessionId: selected.id,
      sessionName: selected.name,
      repos: project.repos,
      role: safeRole(selected.role)
    });
    appliedInitialSessionIdRef.current = initialSessionId;
  }, [hydrateSession, initialSessionId, project.id, project.repos, sessions, setSelectedSession]);

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

  const handleSessionNameChange = async (nextName: string) => {
    const targetSessionId = selectedSessionId ?? sessionId;
    const previous = sessions.find((session) => session.id === targetSessionId);
    if (!previous) {
      setSessionName(nextName);
      return;
    }

    const optimistic: SessionSummary = {
      ...previous,
      name: nextName,
      updatedAt: Date.now()
    };
    const optimisticSessions = [optimistic, ...sessions.filter((session) => session.id !== targetSessionId)];
    setSessionName(nextName);
    setSessions(optimisticSessions);
    setSelectedSession(targetSessionId);
    onProjectSessionsChange?.(optimisticSessions);

    try {
      const renamed = await renameSession(project.id, targetSessionId, nextName);
      const persistedSessions = [renamed, ...optimisticSessions.filter((session) => session.id !== targetSessionId)];
      setSessionName(renamed.name);
      setSessions(persistedSessions);
      setSelectedSession(targetSessionId);
      onProjectSessionsChange?.(persistedSessions);
    } catch {
      setSessionName(previous.name);
      setSessions(sessions);
      setSelectedSession(targetSessionId);
      onProjectSessionsChange?.(sessions);
    }
  };

  const handleRoleChange = (role: Role) => {
    setActiveRole(role);
    const targetSessionId = selectedSessionId ?? sessionId;
    const current = sessions.find((session) => session.id === targetSessionId);
    if (!current) {
      return;
    }

    const nextSessions = [
      {
        ...current,
        role
      },
      ...sessions.filter((session) => session.id !== targetSessionId)
    ];
    setSessions(nextSessions);
    setSelectedSession(targetSessionId);
    onProjectSessionsChange?.(nextSessions);
  };

  const handleSubmit = () => {
    const content = draft.trim();
    if (!content || streaming) {
      return;
    }

    const nextSessions = [
      {
        id: sessionId,
        name: sessionName,
        role: activeRole,
        updatedAt: Date.now(),
        excerpt: content
      },
      ...sessions.filter((session) => session.id !== sessionId)
    ];
    setSessions(nextSessions);
    setSelectedSession(sessionId);
    onProjectSessionsChange?.(nextSessions);

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
    onProjectSessionsChange?.(nextSessions);
    hydrateSession({
      projectId: project.id,
      sessionId: created.id,
      sessionName: created.name,
      repos: project.repos,
      role: safeRole(created.role)
    });
  };

  return (
    <section data-testid="chat-layout" className="flex h-full min-h-0 overflow-hidden border border-borderDefault bg-bgSurface">
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

      <div data-testid="chat-main-column" className="flex min-w-0 flex-1 min-h-0 flex-col overflow-hidden">
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
          onRoleChange={handleRoleChange}
          onSessionNameChange={handleSessionNameChange}
          onToggleKnowledge={toggleKnowledgePanel}
          onToggleSessions={toggleSessionsPanel}
          onCheckout={handleCheckout}
          onOpenRepoBranches={(repoId) => {
            void ensureBranchOptions(repoId);
          }}
          onCloseChat={onClose}
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
    </section>
  );
}
