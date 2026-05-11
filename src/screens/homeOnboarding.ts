export type OnboardingStep = 'name' | 'repos' | 'done';

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
