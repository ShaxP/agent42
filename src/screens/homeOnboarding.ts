import type { Repo } from '../types';
export type OnboardingStep = 'name' | 'repos' | 'done';

interface OnboardingDoneSummary {
  projectName: string;
  repoCountText: string;
  repos: Repo[];
}

function normalizeRepoPath(path: string): string {
  return path.trim().replace(/[\\/]+$/, '').toLowerCase();
}

export function inferRepoNameFromPath(localPath: string): string {
  const normalized = localPath.trim().replace(/[\\/]+$/, '');
  if (!normalized) {
    return 'repo';
  }

  const segments = normalized.split(/[\\/]/).filter(Boolean);
  return segments[segments.length - 1] ?? 'repo';
}

export function isProjectNameValid(name: string): boolean {
  return name.trim().length > 0;
}

export function canContinueFromRepoStep(repoCount: number): boolean {
  return repoCount > 0;
}

export function isRepoAlreadyAdded(repos: Repo[], localPath: string): boolean {
  const normalizedTarget = normalizeRepoPath(localPath);
  return repos.some((repo) => normalizeRepoPath(repo.localPath) === normalizedTarget);
}

export function addOnboardingRepo(repos: Repo[], repo: Repo): Repo[] {
  if (repos.some((entry) => entry.id === repo.id)) {
    return repos.map((entry) => (entry.id === repo.id ? repo : entry));
  }

  return [...repos, repo];
}

export function getOnboardingNextStepFromRepos(repoCount: number): OnboardingStep | null {
  return canContinueFromRepoStep(repoCount) ? 'done' : null;
}

export function getOnboardingBackStep(step: Extract<OnboardingStep, 'repos' | 'done'>): OnboardingStep {
  return step === 'done' ? 'repos' : 'name';
}

export function buildOnboardingDoneSummary(projectName: string, repos: Repo[]): OnboardingDoneSummary {
  const count = repos.length;
  const repoCountText = `${count} repos connected`;
  return {
    projectName: projectName.trim() || 'Untitled project',
    repoCountText,
    repos
  };
}
