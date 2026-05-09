import { invoke } from '@tauri-apps/api/core';
import type { AuthStatus, Project } from '../types';

const isTauriRuntime = () => typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;

export async function getAuthStatus(): Promise<AuthStatus> {
  if (!isTauriRuntime()) {
    return 'unauthenticated';
  }

  return invoke<AuthStatus>('get_auth_status');
}

export async function getProjectList(): Promise<Project[]> {
  if (!isTauriRuntime()) {
    return [];
  }

  return invoke<Project[]>('get_project_list');
}

export async function openChatWindow(projectId: string, sessionId?: string): Promise<void> {
  if (!isTauriRuntime()) {
    return;
  }

  await invoke('open_chat_window', { projectId, sessionId });
}
