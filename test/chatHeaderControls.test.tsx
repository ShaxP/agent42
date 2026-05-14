import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { ChatHeader } from '../src/components/chat/ChatHeader';
import type { Repo } from '../src/types';

const repos: Repo[] = [
  {
    id: 'repo-1',
    name: 'agent42',
    localPath: '/work/agent42',
    lastBranchRead: 'main'
  }
];

function renderHeader(withHome = true) {
  return renderToStaticMarkup(
    <ChatHeader
      projectName="Agent 42"
      sessionName="Session One"
      repos={repos}
      activeRole="Developer"
      branchMap={{ 'repo-1': 'main' }}
      branchOptions={{ 'repo-1': ['main'] }}
      sessionsOpen={false}
      knowledgeOpen={false}
      onRoleChange={vi.fn()}
      onSessionNameChange={vi.fn()}
      onToggleKnowledge={vi.fn()}
      onToggleSessions={vi.fn()}
      onCheckout={vi.fn(async () => undefined)}
      onOpenRepoBranches={vi.fn()}
      onCloseChat={withHome ? vi.fn() : undefined}
    />
  );
}

describe('chat header icon controls', () => {
  it('renders home control left-most in title bar when close callback is provided', () => {
    const markup = renderHeader(true);
    const homeLabelIndex = markup.indexOf('aria-label="Go home"');
    const projectIndex = markup.indexOf('Agent 42');

    expect(homeLabelIndex).toBeGreaterThanOrEqual(0);
    expect(projectIndex).toBeGreaterThan(homeLabelIndex);
  });

  it('renders icon-only sessions and right-bar controls with stable labels', () => {
    const markup = renderHeader(true);

    expect(markup).toContain('aria-label="Toggle sessions panel"');
    expect(markup).toContain('aria-label="Toggle knowledge panel"');
    expect(markup).toContain('aria-hidden="true"');
  });

  it('omits home control when close callback is absent', () => {
    const markup = renderHeader(false);
    expect(markup).not.toContain('aria-label="Go home"');
  });
});
