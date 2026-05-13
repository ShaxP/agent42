import { useEffect, useRef, useState } from 'react';
import type { Repo, Role } from '../../types';
import { BranchSelector } from './BranchSelector';
import { RoleSelector } from './RoleSelector';
import { Button } from '../ui/Button';

interface ChatHeaderProps {
  projectName: string;
  sessionName: string;
  repos: Repo[];
  activeRole: Role;
  branchMap: Record<string, string>;
  branchOptions: Record<string, string[]>;
  pendingRepoId?: string;
  sessionsOpen: boolean;
  knowledgeOpen: boolean;
  onRoleChange: (role: Role) => void;
  onSessionNameChange: (name: string) => void;
  onToggleKnowledge: () => void;
  onToggleSessions: () => void;
  onCheckout: (repoId: string, branch: string) => Promise<void>;
  onOpenRepoBranches: (repoId: string) => void;
  onCloseChat?: () => void;
}

export function ChatHeader({
  projectName,
  sessionName,
  repos,
  activeRole,
  branchMap,
  branchOptions,
  pendingRepoId,
  sessionsOpen,
  knowledgeOpen,
  onRoleChange,
  onSessionNameChange,
  onToggleKnowledge,
  onToggleSessions,
  onCheckout,
  onOpenRepoBranches,
  onCloseChat
}: ChatHeaderProps) {
  const [editing, setEditing] = useState(false);
  const [draftName, setDraftName] = useState(sessionName);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setDraftName(sessionName);
  }, [sessionName]);

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [editing]);

  return (
    <header
      data-testid="chat-title-bar"
      className="flex h-[var(--chat-header-height)] shrink-0 items-center justify-between gap-3 border-b border-borderDefault px-4"
    >
      <div className="flex min-w-0 items-center gap-3">
        <span className="truncate text-xs font-medium text-textPrimary">{projectName}</span>
        <span className="text-textTertiary">/</span>
        {editing ? (
          <input
            ref={inputRef}
            value={draftName}
            onChange={(event) => setDraftName(event.target.value)}
            onBlur={() => {
              onSessionNameChange(draftName.trim() || sessionName);
              setEditing(false);
            }}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                onSessionNameChange(draftName.trim() || sessionName);
                setEditing(false);
              }
              if (event.key === 'Escape') {
                setDraftName(sessionName);
                setEditing(false);
              }
            }}
            className="h-7 w-[220px] rounded-sm border border-borderStrong bg-bgElevated px-2 text-xs text-textPrimary outline-none focus:border-accent"
            aria-label="Edit session name"
          />
        ) : (
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="truncate rounded-sm px-1 text-xs text-textSecondary hover:bg-bgSubtle hover:text-textPrimary"
            aria-label="Edit session name"
          >
            {sessionName}
          </button>
        )}
      </div>

      <div className="flex items-center gap-2">
        {onCloseChat ? (
          <Button size="sm" variant="ghost" onClick={onCloseChat} aria-label="Close chat view">
            Close Chat
          </Button>
        ) : null}
        <Button size="sm" variant={sessionsOpen ? 'secondary' : 'ghost'} onClick={onToggleSessions} aria-label="Toggle sessions panel">
          Sessions
        </Button>
        <RoleSelector value={activeRole} onChange={onRoleChange} />
        <BranchSelector
          repos={repos}
          branchMap={branchMap}
          branchOptions={branchOptions}
          pendingRepoId={pendingRepoId}
          onCheckout={onCheckout}
          onOpenRepoBranches={onOpenRepoBranches}
        />
        <Button size="sm" variant={knowledgeOpen ? 'secondary' : 'ghost'} onClick={onToggleKnowledge} aria-label="Toggle knowledge panel">
          Knowledge
        </Button>
      </div>
    </header>
  );
}
