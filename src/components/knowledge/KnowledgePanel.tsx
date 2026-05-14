import { useMemo, useState } from 'react';
import * as Tabs from '@radix-ui/react-tabs';
import type { Repo, Role } from '../../types';
import { roleBadgeClass } from '../chat/RoleSelector';

interface LearningItem {
  id: string;
  body: string;
  agent: string;
  date: string;
}

interface DecisionItem {
  id: string;
  title: string;
  author: Role;
  date: string;
}

interface KnowledgePanelProps {
  projectId: string;
  repos: Repo[];
  branchMap: Record<string, string>;
  onClose: () => void;
  learnings?: LearningItem[];
  decisions?: DecisionItem[];
}

export function KnowledgePanel({
  projectId,
  repos,
  branchMap,
  onClose,
  learnings = [
    { id: 'l1', body: 'Chat UI now streams placeholders while backend responses are pending.', agent: 'Hermione', date: 'Today' }
  ],
  decisions = [
    { id: 'd1', title: 'Use typed Tauri wrappers for all chat/session IPC calls.', author: 'Developer', date: 'Today' }
  ]
}: KnowledgePanelProps) {
  const [query, setQuery] = useState('');

  const filteredLearnings = useMemo(() => {
    const normalized = query.toLowerCase();
    return learnings.filter(
      (item) => item.body.toLowerCase().includes(normalized) || item.agent.toLowerCase().includes(normalized)
    );
  }, [learnings, query]);

  return (
    <aside data-testid="knowledge-pane" className="h-full w-[var(--knowledge-panel-width)] shrink-0 border-l border-borderDefault bg-bgElevated">
      <Tabs.Root defaultValue="learnings" className="flex h-full flex-col">
        <div className="flex items-center justify-between border-b border-borderDefault px-3 py-2">
          <div>
            <p className="text-xs font-medium text-textPrimary">Knowledge</p>
            <p className="text-[10px] text-textTertiary">{projectId}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-sm px-2 py-1 text-xs text-textSecondary hover:bg-bgSubtle hover:text-textPrimary"
            aria-label="Close knowledge panel"
          >
            Close
          </button>
        </div>

        <Tabs.List className="grid grid-cols-3 border-b border-borderDefault text-xs" aria-label="Knowledge tabs">
          <Tabs.Trigger value="learnings" className="px-2 py-2 text-textSecondary data-[state=active]:bg-bgSubtle data-[state=active]:text-textPrimary">
            Learnings
          </Tabs.Trigger>
          <Tabs.Trigger value="decisions" className="px-2 py-2 text-textSecondary data-[state=active]:bg-bgSubtle data-[state=active]:text-textPrimary">
            Decisions
          </Tabs.Trigger>
          <Tabs.Trigger value="repos" className="px-2 py-2 text-textSecondary data-[state=active]:bg-bgSubtle data-[state=active]:text-textPrimary">
            Repos
          </Tabs.Trigger>
        </Tabs.List>

        <Tabs.Content value="learnings" className="flex-1 overflow-y-auto p-3">
          <input
            type="text"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search learnings"
            className="mb-3 h-8 w-full rounded-sm border border-borderStrong bg-bgSurface px-2 text-xs text-textPrimary outline-none focus:border-accent"
            aria-label="Search learnings"
          />
          <div className="space-y-2">
            {filteredLearnings.map((learning) => (
              <article key={learning.id} className="rounded-sm border border-borderDefault bg-bgSurface p-2">
                <p className="text-xs text-textPrimary">{learning.body}</p>
                <p className="mt-1 text-[10px] text-textTertiary">
                  {learning.agent} · {learning.date}
                </p>
              </article>
            ))}
          </div>
        </Tabs.Content>

        <Tabs.Content value="decisions" className="flex-1 overflow-y-auto p-3">
          <div className="space-y-2">
            {decisions.map((decision) => (
              <article key={decision.id} className="rounded-sm border border-borderDefault bg-bgSurface p-2">
                <p className="text-xs text-textPrimary">{decision.title}</p>
                <div className="mt-1 flex items-center justify-between text-[10px]">
                  <span className={`rounded-full border px-2 py-0.5 ${roleBadgeClass(decision.author)}`}>{decision.author}</span>
                  <span className="text-textTertiary">{decision.date}</span>
                </div>
              </article>
            ))}
          </div>
        </Tabs.Content>

        <Tabs.Content value="repos" className="flex-1 overflow-y-auto p-3">
          <div className="space-y-2">
            {repos.map((repo) => (
              <article key={repo.id} className="rounded-sm border border-borderDefault bg-bgSurface p-2">
                <p className="text-xs text-textPrimary">{repo.name}</p>
                <p className="truncate font-mono text-[10px] text-textTertiary">{repo.localPath}</p>
                <p className="mt-1 text-[10px] text-textSecondary">Branch: {branchMap[repo.id] ?? repo.lastBranchRead}</p>
              </article>
            ))}
          </div>
        </Tabs.Content>
      </Tabs.Root>
    </aside>
  );
}
