import { useMemo, useState } from 'react';
import type { Role, SessionSummary } from '../../types';
import { roleBadgeClass } from '../chat/RoleSelector';
import { Button } from '../ui/Button';

interface SessionHistoryPanelProps {
  projectId: string;
  sessions: SessionSummary[];
  selectedSessionId?: string;
  onSelectSession: (id: string) => void;
  onNewSession: () => void;
  onClose: () => void;
}

const fallbackRole: Role = 'Developer';

function safeRole(role: string): Role {
  const allowed: Role[] = [
    'Architect',
    'Business Analyst',
    'Developer',
    'DevOps Engineer',
    'QA Lead',
    'Tester',
    'Test Automation Expert',
    'DB Expert',
    'Security Reviewer',
    'Technical Writer'
  ];

  return allowed.includes(role as Role) ? (role as Role) : fallbackRole;
}

export function SessionHistoryPanel({ projectId, sessions, selectedSessionId, onSelectSession, onNewSession, onClose }: SessionHistoryPanelProps) {
  const [query, setQuery] = useState('');

  const filteredSessions = useMemo(() => {
    const normalized = query.toLowerCase();
    return sessions.filter(
      (session) => session.name.toLowerCase().includes(normalized) || session.excerpt.toLowerCase().includes(normalized)
    );
  }, [sessions, query]);

  return (
    <aside className="absolute right-0 top-0 z-[var(--z-popover)] h-full w-[320px] border-l border-borderDefault bg-bgElevated">
      <div className="flex items-center justify-between border-b border-borderDefault px-3 py-2">
        <div>
          <p className="text-xs font-medium text-textPrimary">Sessions</p>
          <p className="text-[10px] text-textTertiary">{projectId}</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-sm px-2 py-1 text-xs text-textSecondary hover:bg-bgSubtle hover:text-textPrimary"
          aria-label="Close sessions panel"
        >
          Close
        </button>
      </div>

      <div className="border-b border-borderDefault p-3">
        <input
          type="text"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search sessions"
          className="mb-2 h-8 w-full rounded-sm border border-borderStrong bg-bgSurface px-2 text-xs text-textPrimary outline-none focus:border-accent"
          aria-label="Search sessions"
        />
        <Button size="sm" className="w-full" onClick={onNewSession} aria-label="Create new session">
          New session
        </Button>
      </div>

      <div className="h-[calc(100%-132px)] overflow-y-auto p-3">
        <div className="space-y-2">
          {filteredSessions.map((session) => {
            const role = safeRole(session.role);
            const selected = session.id === selectedSessionId;
            return (
              <button
                key={session.id}
                type="button"
                onClick={() => onSelectSession(session.id)}
                className={`w-full rounded-sm border p-2 text-left transition ${
                  selected
                    ? 'border-accent bg-bgSubtle'
                    : 'border-borderDefault bg-bgSurface hover:border-borderStrong hover:bg-bgSubtle'
                }`}
              >
                <p className="truncate text-xs font-medium text-textPrimary">{session.name}</p>
                <p className="mt-1 line-clamp-2 text-[10px] text-textSecondary">{session.excerpt}</p>
                <div className="mt-2 flex items-center justify-between">
                  <span className={`rounded-full border px-2 py-0.5 text-[10px] ${roleBadgeClass(role)}`}>{role}</span>
                  <span className="text-[10px] text-textTertiary">{new Date(session.updatedAt).toLocaleDateString()}</span>
                </div>
              </button>
            );
          })}

          {filteredSessions.length === 0 ? <p className="text-xs text-textDisabled">No matching sessions.</p> : null}
        </div>
      </div>
    </aside>
  );
}
