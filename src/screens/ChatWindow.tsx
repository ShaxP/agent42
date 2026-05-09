import { useEffect, useMemo, useState } from 'react';
import { ChatHeader } from '../components/chat/ChatHeader';
import { ChatInput } from '../components/chat/ChatInput';
import { MessageList } from '../components/chat/MessageList';
import { KnowledgePanel } from '../components/knowledge/KnowledgePanel';
import { SessionHistoryPanel } from '../components/sessions/SessionHistoryPanel';
import {
  checkoutBranch,
  getCurrentBranch,
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
import type { Repo, SessionSummary } from '../types';

const projectId = 'project-acme';
const projectName = 'Acme Platform';
const defaultSessionId = 'session-default';

const repos: Repo[] = [
  { id: 'repo-backend', name: 'backend', localPath: '/Users/dev/backend-api', lastBranchRead: 'main' },
  { id: 'repo-frontend', name: 'frontend', localPath: '/Users/dev/frontend-web', lastBranchRead: 'feature/login' },
  { id: 'repo-shared', name: 'shared', localPath: '/Users/dev/shared-kernel', lastBranchRead: 'main' }
];

const fallbackSessions: SessionSummary[] = [
  {
    id: defaultSessionId,
    name: 'API risk review',
    role: 'QA Lead',
    updatedAt: Date.now(),
    excerpt: 'Evaluate edge cases in branch-switching and role-aware prompts.'
  }
];

export function ChatWindow() {
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
    setSessions,
    setSelectedSession,
    toggleKnowledgePanel,
    toggleSessionsPanel
  } = useSessionsStore();

  const [branchOptions, setBranchOptions] = useState<Record<string, string[]>>({});
  const [pendingRepoId, setPendingRepoId] = useState<string | undefined>();

  useEffect(() => {
    hydrateSession({
      projectId,
      sessionId: defaultSessionId,
      sessionName: 'API risk review',
      repos,
      role: 'QA Lead'
    });
  }, [hydrateSession]);

  useEffect(() => {
    let mounted = true;

    void (async () => {
      const remoteSessions = await getSessionList(projectId);
      if (!mounted) {
        return;
      }

      setSessions(remoteSessions.length > 0 ? remoteSessions : fallbackSessions);
    })();

    return () => {
      mounted = false;
    };
  }, [setSessions]);

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
          }
        }),
        onBranchChanged((event) => {
          if (event.sessionId === sessionId) {
            setBranch(event.repoId, event.branch);
          }
        })
      ]);

      if (!active) {
        unlistenChunk();
        unlistenDone();
        unlistenAgents();
        unlistenBranch();
        return;
      }

      unsubscribers.push(unlistenChunk, unlistenDone, unlistenAgents, unlistenBranch);
    })();

    return () => {
      active = false;
      unsubscribers.forEach((unsubscribe) => unsubscribe());
    };
  }, [appendStreamingChunk, finishStreaming, sessionId, setActiveAgents, setBranch]);

  const ensureBranchOptions = async (repoId: string) => {
    if (branchOptions[repoId]?.length) {
      return;
    }

    const [branches, currentBranch] = await Promise.all([listBranches(projectId, repoId), getCurrentBranch(repoId)]);

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

    if (hasTauriRuntime()) {
      void sendMessage({
        sessionId,
        message: content,
        role: activeRole,
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
    return repos
      .map((repo) => {
        const branch = branchMap[repo.id] ?? repo.lastBranchRead;
        return `${repo.name}:${branch}`;
      })
      .join(' · ');
  }, [branchMap]);

  const handleNewSession = () => {
    const generatedId = `session-${Date.now()}`;
    setSelectedSession(generatedId);
    setSessionName('New Session');
  };

  return (
    <section className="relative flex h-full min-h-[560px] flex-col overflow-hidden rounded-md border border-borderDefault bg-bgSurface">
      <ChatHeader
        projectName={projectName}
        sessionName={sessionName}
        repos={repos}
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

      <MessageList messages={messages} streaming={streaming} activeAgents={activeAgents} activeRole={activeRole} />

      <ChatInput
        value={draft}
        onChange={setDraft}
        attachments={attachments}
        onAddAttachment={() => addAttachment({ id: `${Date.now()}`, label: 'context-snippet.ts' })}
        onRemoveAttachment={removeAttachment}
        onSubmit={handleSubmit}
        disabled={streaming}
        activeRole={activeRole}
        branchSummary={branchSummary}
      />

      {knowledgePanelOpen ? (
        <KnowledgePanel projectId={projectId} repos={repos} branchMap={branchMap} onClose={toggleKnowledgePanel} />
      ) : null}

      {sessionsPanelOpen ? (
        <SessionHistoryPanel
          projectId={projectId}
          sessions={sessions}
          selectedSessionId={selectedSessionId ?? sessionId}
          onSelectSession={setSelectedSession}
          onNewSession={handleNewSession}
          onClose={toggleSessionsPanel}
        />
      ) : null}
    </section>
  );
}
