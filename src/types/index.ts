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
  repos: Repo[];
  sessions: SessionSummary[];
}
