import { create } from 'zustand';
import type { Repo, Role, SessionSummary } from '../types';

export interface ChatMessage {
  id: string;
  role: 'user' | 'agent';
  content: string;
  timestamp: number;
  agentsMeta?: {
    agents: string[];
    userRole: Role;
    tier?: string;
  };
}

export interface DraftAttachment {
  id: string;
  label: string;
}

interface SessionState {
  projectId: string;
  sessionId: string;
  sessionName: string;
  activeRole: Role;
  branchMap: Record<string, string>;
  messages: ChatMessage[];
  draft: string;
  attachments: DraftAttachment[];
  sessions: SessionSummary[];
  selectedSessionId?: string;
  streaming: boolean;
  streamingMessageId?: string;
  activeAgents: string[];
  activeStatusDetails: string[];
  knowledgePanelOpen: boolean;
  sessionsPanelOpen: boolean;
  hydrateSession: (input: {
    projectId: string;
    sessionId: string;
    sessionName: string;
    repos: Repo[];
    role?: Role;
  }) => void;
  setActiveRole: (role: Role) => void;
  setSessionName: (name: string) => void;
  setBranch: (repoId: string, branch: string) => void;
  setDraft: (draft: string) => void;
  addAttachment: (attachment: DraftAttachment) => void;
  removeAttachment: (id: string) => void;
  clearComposer: () => void;
  addUserMessage: (content: string) => void;
  startStreaming: () => void;
  appendStreamingChunk: (chunk: string) => void;
  finishStreaming: (meta?: { agents?: string[]; userRole?: Role; tier?: string }) => void;
  setActiveAgents: (agents: string[]) => void;
  pushActiveStatusDetail: (detail?: string | null) => void;
  clearActiveStatusDetails: () => void;
  setMessages: (messages: ChatMessage[]) => void;
  setSessions: (sessions: SessionSummary[]) => void;
  setSelectedSession: (sessionId: string) => void;
  toggleKnowledgePanel: () => void;
  toggleSessionsPanel: () => void;
}

const DEFAULT_ROLE: Role = 'Developer';

function nextId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export const useSessionsStore = create<SessionState>((set, get) => ({
  projectId: 'local-project',
  sessionId: 'local-session',
  sessionName: 'New Session',
  activeRole: DEFAULT_ROLE,
  branchMap: {},
  messages: [],
  draft: '',
  attachments: [],
  sessions: [],
  streaming: false,
  activeAgents: [],
  activeStatusDetails: [],
  knowledgePanelOpen: false,
  sessionsPanelOpen: false,

  hydrateSession: ({ projectId, sessionId, sessionName, repos, role }) => {
    const branchMap = repos.reduce<Record<string, string>>((acc, repo) => {
      acc[repo.id] = repo.lastBranchRead;
      return acc;
    }, {});

    set((state) => ({
      projectId,
      sessionId,
      sessionName,
      activeRole: role ?? state.activeRole,
      branchMap: { ...branchMap, ...state.branchMap },
      messages: [],
      streaming: false,
      streamingMessageId: undefined,
      activeAgents: [],
      activeStatusDetails: [],
      draft: '',
      attachments: []
    }));
  },

  setActiveRole: (activeRole) => set({ activeRole }),

  setSessionName: (sessionName) => set({ sessionName }),

  setBranch: (repoId, branch) => {
    set((state) => ({
      branchMap: {
        ...state.branchMap,
        [repoId]: branch
      }
    }));
  },

  setDraft: (draft) => set({ draft }),

  addAttachment: (attachment) => {
    set((state) => ({ attachments: [...state.attachments, attachment] }));
  },

  removeAttachment: (id) => {
    set((state) => ({ attachments: state.attachments.filter((attachment) => attachment.id !== id) }));
  },

  clearComposer: () => {
    set({ draft: '', attachments: [] });
  },

  addUserMessage: (content) => {
    const userMessage: ChatMessage = {
      id: nextId(),
      role: 'user',
      content,
      timestamp: Date.now()
    };

    set((state) => ({
      messages: [...state.messages, userMessage]
    }));
  },

  startStreaming: () => {
    const { activeRole } = get();
    const streamingMessage: ChatMessage = {
      id: nextId(),
      role: 'agent',
      content: '',
      timestamp: Date.now(),
      agentsMeta: {
        agents: [],
        userRole: activeRole
      }
    };

    set((state) => ({
      messages: [...state.messages, streamingMessage],
      streaming: true,
      streamingMessageId: streamingMessage.id,
      activeStatusDetails: []
    }));
  },

  appendStreamingChunk: (chunk) => {
    set((state) => {
      if (!state.streamingMessageId) {
        return state;
      }

      return {
        messages: state.messages.map((message) => {
          if (message.id !== state.streamingMessageId) {
            return message;
          }

          return {
            ...message,
            content: `${message.content}${chunk}`
          };
        })
      };
    });
  },

  finishStreaming: (meta) => {
    set((state) => {
      if (!state.streamingMessageId) {
        return {
          streaming: false,
          activeAgents: [],
          activeStatusDetails: []
        };
      }

      return {
        messages: state.messages.map((message) => {
          if (message.id !== state.streamingMessageId) {
            return message;
          }

          const currentMeta = message.agentsMeta;

          return {
            ...message,
            agentsMeta: {
              agents: meta?.agents ?? currentMeta?.agents ?? [],
              userRole: meta?.userRole ?? currentMeta?.userRole ?? state.activeRole,
              tier: meta?.tier ?? currentMeta?.tier
            }
          };
        }),
        streaming: false,
        streamingMessageId: undefined,
        activeAgents: [],
        activeStatusDetails: []
      };
    });
  },

  setActiveAgents: (activeAgents) => set({ activeAgents }),

  pushActiveStatusDetail: (detail) =>
    set((state) => {
      const next = (detail ?? '').trim();
      if (!next) {
        return state;
      }

      const prev = state.activeStatusDetails[state.activeStatusDetails.length - 1];
      if (prev === next) {
        return state;
      }

      return {
        activeStatusDetails: [...state.activeStatusDetails, next].slice(-6)
      };
    }),

  clearActiveStatusDetails: () => set({ activeStatusDetails: [] }),

  setMessages: (messages) =>
    set({ messages, streaming: false, streamingMessageId: undefined, activeAgents: [], activeStatusDetails: [] }),

  setSessions: (sessions) => {
    const selectedSessionId = sessions[0]?.id;
    set({ sessions, selectedSessionId });
  },

  setSelectedSession: (selectedSessionId) => set({ selectedSessionId }),

  toggleKnowledgePanel: () => set((state) => ({ knowledgePanelOpen: !state.knowledgePanelOpen })),

  toggleSessionsPanel: () => set((state) => ({ sessionsPanelOpen: !state.sessionsPanelOpen }))
}));
