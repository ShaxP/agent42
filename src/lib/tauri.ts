import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { open } from '@tauri-apps/plugin-dialog';
import type { AuthStatus, Project, Repo, Role, SessionSummary } from '../types';

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
  status: 'running' | 'idle' | 'error';
  agents: string[];
  detail?: string | null;
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
  projectId: string;
  repoId?: string;
  branchMap: Record<string, string>;
}

export interface SessionMessage {
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

export const hasTauriRuntime = () => typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;

const localProjects: Project[] = [];

export async function getAuthStatus(): Promise<AuthStatus> {
  if (!hasTauriRuntime()) {
    return 'unauthenticated';
  }

  return invoke<AuthStatus>('get_auth_status');
}

export async function signInWithGitHubCopilot(): Promise<AuthStatus> {
  if (!hasTauriRuntime()) {
    return 'unauthenticated';
  }

  return invoke<AuthStatus>('sign_in_with_github_copilot');
}

export async function getProjectList(): Promise<Project[]> {
  if (!hasTauriRuntime()) {
    return [...localProjects];
  }

  return invoke<Project[]>('get_project_list');
}

export async function createProject(name: string): Promise<Project> {
  if (!hasTauriRuntime()) {
    const trimmed = name.trim();
    if (!trimmed) {
      throw new Error('Project name must not be empty');
    }

    const project: Project = {
      id: `p${Date.now()}`,
      name: trimmed,
      repos: [],
      sessions: []
    };
    localProjects.unshift(project);
    return project;
  }

  return invoke<Project>('create_project', { name });
}

export async function createRepo(projectId: string, name: string, localPath: string): Promise<Repo> {
  const trimmedName = name.trim();
  if (!trimmedName) {
    throw new Error('Repo name must not be empty');
  }

  const trimmedPath = localPath.trim();
  if (!trimmedPath) {
    throw new Error('Repo local path must not be empty');
  }

  if (!hasTauriRuntime()) {
    const repo: Repo = {
      id: `repo-custom-${Date.now()}`,
      name: trimmedName,
      localPath: trimmedPath,
      lastBranchRead: 'main'
    };

    const project = localProjects.find((entry) => entry.id === projectId);
    if (!project) {
      throw new Error(`Project not found: ${projectId}`);
    }

    project.repos.push(repo);
    return repo;
  }

  return invoke<Repo>('create_repo', { projectId, name: trimmedName, localPath: trimmedPath });
}

export async function renameProject(projectId: string, name: string): Promise<Project> {
  const trimmed = name.trim();
  if (!trimmed) {
    throw new Error('Project name must not be empty');
  }

  if (!hasTauriRuntime()) {
    const project = localProjects.find((entry) => entry.id === projectId);
    if (!project) {
      throw new Error(`Project not found: ${projectId}`);
    }
    project.name = trimmed;
    return project;
  }

  return invoke<Project>('rename_project', { projectId, name: trimmed });
}

export async function deleteProject(projectId: string): Promise<void> {
  if (!hasTauriRuntime()) {
    const next = localProjects.filter((entry) => entry.id !== projectId);
    localProjects.splice(0, localProjects.length, ...next);
    return;
  }

  await invoke('delete_project', { projectId });
}

export async function renameRepo(projectId: string, repoId: string, name: string): Promise<Repo> {
  const trimmed = name.trim();
  if (!trimmed) {
    throw new Error('Repo name must not be empty');
  }

  if (!hasTauriRuntime()) {
    const repo = localProjects
      .find((project) => project.id === projectId)
      ?.repos.find((entry) => entry.id === repoId);
    if (!repo) {
      throw new Error(`Repo not found: ${repoId}`);
    }
    repo.name = trimmed;
    return repo;
  }

  return invoke<Repo>('rename_repo', { projectId, repoId, name: trimmed });
}

export async function deleteRepo(projectId: string, repoId: string): Promise<void> {
  if (!hasTauriRuntime()) {
    const project = localProjects.find((entry) => entry.id === projectId);
    if (!project) {
      throw new Error(`Project not found: ${projectId}`);
    }
    project.repos = project.repos.filter((repo) => repo.id !== repoId);
    return;
  }

  await invoke('delete_repo', { projectId, repoId });
}

export async function resetPersistedState(): Promise<void> {
  if (!hasTauriRuntime()) {
    localProjects.splice(0, localProjects.length);
    return;
  }

  await invoke('reset_persisted_state');
}

export async function restoreStateFromBackup(): Promise<void> {
  if (!hasTauriRuntime()) {
    throw new Error('Backup restore is only available in the desktop app runtime.');
  }

  await invoke('restore_state_from_backup');
}

export async function pickRepoFolder(): Promise<string | null> {
  if (!hasTauriRuntime()) {
    throw new Error('Folder picker is only available in the desktop app. Start with `npm run tauri dev`.');
  }

  const selected = await open({
    directory: true,
    multiple: false,
    title: 'Select repository root folder'
  });

  if (Array.isArray(selected)) {
    return selected[0] ?? null;
  }

  if (typeof selected === 'string') {
    return selected;
  }

  return null;
}

export async function getSessionList(projectId: string): Promise<SessionSummary[]> {
  if (!hasTauriRuntime()) {
    return [];
  }

  return invoke<SessionSummary[]>('get_session_list', { projectId });
}

export async function createSession(projectId: string, role: Role, name?: string): Promise<SessionSummary> {
  if (!hasTauriRuntime()) {
    const project = localProjects.find((entry) => entry.id === projectId);
    if (!project) {
      throw new Error(`Project not found: ${projectId}`);
    }

    const created: SessionSummary = {
      id: `session-${Date.now()}`,
      name: name ?? 'New Session',
      role,
      updatedAt: Date.now(),
      excerpt: 'Session created locally'
    };
    project.sessions = [created, ...project.sessions.filter((session) => session.id !== created.id)];
    return created;
  }

  return invoke<SessionSummary>('create_session', { projectId, role, name });
}

export async function renameSession(projectId: string, sessionId: string, name: string): Promise<SessionSummary> {
  const trimmed = name.trim();
  if (!trimmed) {
    throw new Error('Session name must not be empty');
  }

  if (!hasTauriRuntime()) {
    const project = localProjects.find((entry) => entry.id === projectId);
    if (!project) {
      throw new Error(`Project not found: ${projectId}`);
    }

    const existing = project.sessions.find((session) => session.id === sessionId);
    if (!existing) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    const renamed: SessionSummary = {
      ...existing,
      name: trimmed,
      updatedAt: Date.now()
    };
    project.sessions = project.sessions.map((session) => (session.id === sessionId ? renamed : session));
    return renamed;
  }

  return invoke<SessionSummary>('rename_session', { projectId, sessionId, name: trimmed });
}

export async function getSessionMessages(sessionId: string): Promise<SessionMessage[]> {
  if (!hasTauriRuntime()) {
    return [];
  }

  return invoke<SessionMessage[]>('get_session_messages', { sessionId });
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
    projectId: input.projectId,
    repoId: input.repoId,
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
