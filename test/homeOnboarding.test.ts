import { describe, expect, it } from 'vitest';
import { canContinueFromRepoStep, inferRepoNameFromPath, isProjectNameValid } from '../src/screens/homeOnboarding';

describe('home onboarding helpers', () => {
  it('infers repo name from unix and windows paths', () => {
    expect(inferRepoNameFromPath('/Users/alex/work/backend')).toBe('backend');
    expect(inferRepoNameFromPath('C:\\Users\\alex\\work\\frontend\\')).toBe('frontend');
  });

  it('validates project name before step 1 continuation', () => {
    expect(isProjectNameValid('Agent 42')).toBe(true);
    expect(isProjectNameValid('   ')).toBe(false);
  });

  it('requires at least one repo before step 2 continuation', () => {
    expect(canContinueFromRepoStep(0)).toBe(false);
    expect(canContinueFromRepoStep(1)).toBe(true);
  });
});
