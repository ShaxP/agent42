import { useEffect, useRef, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faHouse } from '@fortawesome/free-solid-svg-icons';
import type { Repo, Role } from '../../types';
import { BranchSelector } from './BranchSelector';
import { RoleSelector } from './RoleSelector';
import { Button } from '../ui/Button';

interface HeaderIconProps {
  path: string;
}

function HeaderIcon({ path, className = '' }: HeaderIconProps & { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 20 20"
      fill="none"
      className={`h-3.5 w-3.5 stroke-current ${className}`}
      strokeWidth={1.8}
    >
      <path d={path} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

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
  const renameCommittedRef = useRef(false);

  useEffect(() => {
    setDraftName(sessionName);
  }, [sessionName]);

  useEffect(() => {
    if (editing) {
      renameCommittedRef.current = false;
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [editing]);

  const commitSessionRename = () => {
    if (renameCommittedRef.current) {
      return;
    }

    renameCommittedRef.current = true;
    onSessionNameChange(draftName.trim() || sessionName);
    setEditing(false);
  };

  return (
    <header
      data-testid="chat-title-bar"
      className="flex h-[var(--chat-header-height)] shrink-0 items-center justify-between gap-3 border-b border-borderDefault px-4"
    >
      <div className="flex min-w-0 items-center gap-3">
        {onCloseChat ? (
          <Button
            size="sm"
            variant="ghost"
            className="px-2"
            onClick={onCloseChat}
            aria-label="Go home"
            iconLeft={<FontAwesomeIcon icon={faHouse} className="h-3.5 w-3.5" aria-hidden="true" />}
          >
            <span className="sr-only">Home</span>
          </Button>
        ) : null}
        <span className="truncate text-xs font-medium text-textPrimary">{projectName}</span>
        <span className="text-textTertiary">/</span>
        {editing ? (
          <input
            ref={inputRef}
            value={draftName}
            onChange={(event) => setDraftName(event.target.value)}
            onBlur={commitSessionRename}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                commitSessionRename();
              }
              if (event.key === 'Escape') {
                renameCommittedRef.current = true;
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
        <Button
          size="sm"
          variant="ghost"
          className={`px-2 ${sessionsOpen ? 'border-transparent bg-transparent hover:bg-transparent' : ''}`}
          onClick={onToggleSessions}
          aria-label="Toggle sessions panel"
          iconLeft={
            <HeaderIcon
              path="M10 3.5a6.5 6.5 0 1 1-4.6 1.9M10 6.2v4.2l2.8 1.8"
              className={sessionsOpen ? 'text-success' : ''}
            />
          }
        >
          <span className="sr-only">Sessions</span>
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
        <Button
          size="sm"
          variant="ghost"
          className={`px-2 ${knowledgeOpen ? 'border-transparent bg-transparent hover:bg-transparent' : ''}`}
          onClick={onToggleKnowledge}
          aria-label="Toggle knowledge panel"
          iconLeft={
            <HeaderIcon
              path="M4 5h12M4 10h12M4 15h12"
              className={knowledgeOpen ? 'text-success' : ''}
            />
          }
        >
          <span className="sr-only">Knowledge</span>
        </Button>
      </div>
    </header>
  );
}
