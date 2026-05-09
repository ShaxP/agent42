import { useMemo, useState } from 'react';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import type { Repo } from '../../types';

interface BranchSelectorProps {
  repos: Repo[];
  branchMap: Record<string, string>;
  branchOptions: Record<string, string[]>;
  pendingRepoId?: string;
  collapseThreshold?: number;
  onCheckout: (repoId: string, branch: string) => Promise<void>;
  onOpenRepoBranches?: (repoId: string) => void;
}

interface RepoBranchMenuProps {
  repo: Repo;
  activeBranch: string;
  options: string[];
  pending: boolean;
  onCheckout: (branch: string) => Promise<void>;
  onOpen?: () => void;
}

function BranchMenu({ repo, activeBranch, options, pending, onCheckout, onOpen }: RepoBranchMenuProps) {
  const [query, setQuery] = useState('');
  const filtered = useMemo(() => {
    if (!query.trim()) {
      return options;
    }

    const normalized = query.toLowerCase();
    return options.filter((branch) => branch.toLowerCase().includes(normalized));
  }, [options, query]);

  return (
    <DropdownMenu.Root onOpenChange={(open) => open && onOpen?.()}>
      <DropdownMenu.Trigger asChild>
        <button
          type="button"
          className="inline-flex h-8 items-center gap-1 rounded-md border border-borderStrong bg-bgSubtle px-2.5 text-xs text-textPrimary transition hover:border-accent"
          aria-label={`Select branch for ${repo.name}`}
        >
          <span className="text-textSecondary">{repo.name}:</span>
          {pending ? (
            <span className="inline-flex h-3.5 w-3.5 animate-spin rounded-full border border-textSecondary border-t-transparent" aria-hidden />
          ) : (
            <span className="font-mono">{activeBranch}</span>
          )}
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          sideOffset={6}
          className="z-[var(--z-dropdown)] min-w-[280px] rounded-md border border-borderDefault bg-bgElevated p-2 shadow-md"
        >
          <label className="mb-2 block text-[10px] uppercase tracking-[0.08em] text-textTertiary" htmlFor={`branch-filter-${repo.id}`}>
            Filter branches
          </label>
          <input
            id={`branch-filter-${repo.id}`}
            type="text"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => event.stopPropagation()}
            className="mb-2 h-8 w-full rounded-sm border border-borderStrong bg-bgSurface px-2 text-xs text-textPrimary outline-none ring-0 focus:border-accent"
            placeholder="Search branch"
          />
          <div className="max-h-64 overflow-y-auto">
            {filtered.length === 0 ? <p className="px-2 py-1 text-xs text-textDisabled">No branches found</p> : null}
            {filtered.map((branch) => {
              const selected = branch === activeBranch;
              return (
                <DropdownMenu.Item
                  key={branch}
                  onSelect={() => {
                    void onCheckout(branch);
                  }}
                  className="flex cursor-pointer items-center justify-between rounded-sm px-2 py-1.5 text-xs text-textSecondary outline-none data-[highlighted]:bg-bgSubtle data-[highlighted]:text-textPrimary"
                >
                  <span className="font-mono">{branch}</span>
                  {selected ? <span aria-hidden>✓</span> : null}
                </DropdownMenu.Item>
              );
            })}
          </div>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}

export function BranchSelector({
  repos,
  branchMap,
  branchOptions,
  pendingRepoId,
  collapseThreshold = 4,
  onCheckout,
  onOpenRepoBranches
}: BranchSelectorProps) {
  if (repos.length >= collapseThreshold) {
    return (
      <DropdownMenu.Root>
        <DropdownMenu.Trigger asChild>
          <button
            type="button"
            className="inline-flex h-8 items-center rounded-md border border-borderStrong bg-bgSubtle px-3 text-xs text-textPrimary transition hover:border-accent"
            aria-label="Open branch controls"
          >
            Branches ({repos.length})
          </button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Portal>
          <DropdownMenu.Content
            sideOffset={6}
            align="end"
            className="z-[var(--z-dropdown)] min-w-[320px] rounded-md border border-borderDefault bg-bgElevated p-2 shadow-md"
          >
            <div className="max-h-80 space-y-3 overflow-y-auto pr-1">
              {repos.map((repo) => (
                <div key={repo.id} className="space-y-1 rounded-sm border border-borderDefault p-2">
                  <p className="text-[10px] uppercase tracking-[0.08em] text-textTertiary">{repo.name}</p>
                  <BranchMenu
                    repo={repo}
                    activeBranch={branchMap[repo.id] ?? repo.lastBranchRead}
                    options={branchOptions[repo.id] ?? [branchMap[repo.id] ?? repo.lastBranchRead]}
                    pending={pendingRepoId === repo.id}
                    onCheckout={async (branch) => onCheckout(repo.id, branch)}
                    onOpen={() => onOpenRepoBranches?.(repo.id)}
                  />
                </div>
              ))}
            </div>
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>
    );
  }

  return (
    <div className="flex items-center gap-2">
      {repos.map((repo) => (
        <BranchMenu
          key={repo.id}
          repo={repo}
          activeBranch={branchMap[repo.id] ?? repo.lastBranchRead}
          options={branchOptions[repo.id] ?? [branchMap[repo.id] ?? repo.lastBranchRead]}
          pending={pendingRepoId === repo.id}
          onCheckout={async (branch) => onCheckout(repo.id, branch)}
          onOpen={() => onOpenRepoBranches?.(repo.id)}
        />
      ))}
    </div>
  );
}
