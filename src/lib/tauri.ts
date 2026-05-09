import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import type { AuthStatus, Project, Role, SessionSummary } from '../types';

export interface ResponseChunkEvent {
  sessionId: string;
  chunk: string;
}

export interface ResponseDoneEvent {
  sessionId: string;
  agentsMeta?: {
    agents?: string[];
    userRole?: Role;
    tier?: string;
  };
}

export interface AgentStatusEvent {
  sessionId: string;
  agents: string[];
}

export interface BranchChangedEvent {
  sessionId: string;
  repoId: string;
  branch: string;
}

export interface SendMessageInput {
  sessionId: string;
  message: string;
  role: Role;
  branchMap: Record<string, string>;
}

export const hasTauriRuntime = () => typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;

export async function getAuthStatus(): Promise<AuthStatus> {
  if (!hasTauriRuntime()) {
    return 'unauthenticated';
  }

  return invoke<AuthStatus>('get_auth_status');
}

export async function getProjectList(): Promise<Project[]> {
  if (!hasTauriRuntime()) {
    return [];
  }

  return invoke<Project[]>('get_project_list');
}

export async function getSessionList(projectId: string): Promise<SessionSummary[]> {
  if (!hasTauriRuntime()) {
    return [];
  }

  return invoke<SessionSummary[]>('get_session_list', { projectId });
}

export async function listBranches(projectId: string, repoId: string): Promise<string[]> {
  if (!hasTauriRuntime()) {
    return [];
  }

  return invoke<string[]>('list_branches', { projectId, repoId });
}

export async function getCurrentBranch(repoId: string): Promise<string> {
  if (!hasTauriRuntime()) {
    return 'main';
  }

  return invoke<string>('get_current_branch', { repoId });
}

export async function checkoutBranch(sessionId: string, repoId: string, branch: string): Promise<void> {
  if (!hasTauriRuntime()) {
    return;
  }

  await invoke('checkout_branch', { sessionId, repoId, branch });
}

export async function sendMessage(input: SendMessageInput): Promise<void> {
  if (!hasTauriRuntime()) {
    return;
  }

  await invoke('send_message', {
    sessionId: input.sessionId,
    message: input.message,
    role: input.role,
    branchMap: input.branchMap
  });
}

export async function openChatWindow(projectId: string, sessionId?: string): Promise<void> {
  if (!hasTauriRuntime()) {
    return;
  }

  await invoke('open_chat_window', { projectId, sessionId });
}

export async function onResponseChunk(handler: (event: ResponseChunkEvent) => void): Promise<() => void> {
  if (!hasTauriRuntime()) {
    return () => undefined;
  }

  return listen<ResponseChunkEvent>('response_chunk', ({ payload }) => {
    handler(payload);
  });
}

export async function onResponseDone(handler: (event: ResponseDoneEvent) => void): Promise<() => void> {
  if (!hasTauriRuntime()) {
    return () => undefined;
  }

  return listen<ResponseDoneEvent>('response_done', ({ payload }) => {
    handler(payload);
  });
}

export async function onAgentStatus(handler: (event: AgentStatusEvent) => void): Promise<() => void> {
  if (!hasTauriRuntime()) {
    return () => undefined;
  }

  return listen<AgentStatusEvent>('agent_status', ({ payload }) => {
    handler(payload);
  });
}

export async function onBranchChanged(handler: (event: BranchChangedEvent) => void): Promise<() => void> {
  if (!hasTauriRuntime()) {
    return () => undefined;
  }

  return listen<BranchChangedEvent>('branch_changed', ({ payload }) => {
    handler(payload);
  });
}
