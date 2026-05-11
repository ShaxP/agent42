export type AuthStatus = 'authenticated' | 'unauthenticated' | 'expired' | 'checking';

export type Role =
  | 'Architect'
  | 'Business Analyst'
  | 'Developer'
  | 'DevOps Engineer'
  | 'QA Lead'
  | 'Tester'
  | 'Test Automation Expert'
  | 'DB Expert'
  | 'Security Reviewer'
  | 'Technical Writer';

export interface Repo {
  id: string;
  name: string;
  localPath: string;
  lastBranchRead: string;
}

export interface SessionSummary {
  id: string;
  name: string;
  role: string;
  updatedAt: number;
  excerpt: string;
}

export interface Project {
  id: string;
  name: string;
  squadPath?: string;
  repos: Repo[];
  sessions: SessionSummary[];
}

export type AgentRuntimeStatus = 'running' | 'idle' | 'error';

export interface AgentStatusEvent {
  sessionId: string;
  status: AgentRuntimeStatus;
  agents: string[];
  detail?: string | null;
}

export interface ResponseChunkEvent {
  sessionId: string;
  chunk: string;
}

export interface AgentsMeta {
  agents: string[];
  role: string;
  mock: boolean;
}

export interface ResponseDoneEvent {
  sessionId: string;
  agentsMeta: AgentsMeta;
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
  branchMap?: Record<string, string>;
}

export interface CheckoutBranchInput {
  sessionId: string;
  repoId: string;
  branch: string;
}
