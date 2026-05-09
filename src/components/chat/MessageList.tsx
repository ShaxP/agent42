import { useEffect, useMemo, useRef } from 'react';
import type { Role } from '../../types';
import type { ChatMessage } from '../../store/sessions';
import { roleBadgeClass } from './RoleSelector';

interface MessageListProps {
  messages: ChatMessage[];
  streaming: boolean;
  activeAgents: string[];
  activeRole: Role;
}

function formatTimestamp(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function AgentMeta({ agents, role }: { agents: string[]; role: Role }) {
  const line = useMemo(() => {
    if (agents.length === 0) {
      return `Responding as ${role}`;
    }

    return `${agents.join(' + ')} · as ${role}`;
  }, [agents, role]);

  return (
    <div className="mb-1 inline-flex items-center gap-2 rounded-sm border border-borderDefault bg-bgElevated px-2 py-1 text-[10px] text-textSecondary">
      <span>{line}</span>
    </div>
  );
}

export function MessageList({ messages, streaming, activeAgents, activeRole }: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, streaming]);

  return (
    <main className="flex-1 overflow-y-auto px-5 py-4">
      <div className="mx-auto flex w-full max-w-[var(--chat-content-max-width)] flex-col gap-4">
        {messages.map((message) => {
          if (message.role === 'user') {
            return (
              <article key={message.id} className="ml-auto w-full max-w-[80%] rounded-md border border-borderDefault bg-bgSubtle px-3 py-2">
                <p className="mb-1 text-[10px] uppercase tracking-[0.08em] text-textTertiary">You · {formatTimestamp(message.timestamp)}</p>
                <p className="whitespace-pre-wrap text-sm text-textPrimary">{message.content}</p>
              </article>
            );
          }

          return (
            <article key={message.id} className="w-full max-w-[92%]">
              <AgentMeta agents={message.agentsMeta?.agents ?? []} role={message.agentsMeta?.userRole ?? activeRole} />
              <div className="rounded-md border border-borderDefault bg-bgSurface px-3 py-2">
                <div className="mb-2 flex items-center gap-2 text-[10px] text-textTertiary">
                  <span className={`rounded-full border px-2 py-0.5 ${roleBadgeClass(message.agentsMeta?.userRole ?? activeRole)}`}>
                    {message.agentsMeta?.userRole ?? activeRole}
                  </span>
                  <span>{formatTimestamp(message.timestamp)}</span>
                </div>
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-textPrimary">{message.content || '...'}</p>
              </div>
            </article>
          );
        })}

        {streaming ? (
          <div className="inline-flex items-center gap-2 text-xs italic text-textSecondary" aria-live="polite">
            <span className="inline-flex h-2 w-2 animate-pulse rounded-full bg-accent" aria-hidden />
            <span>{activeAgents.length > 0 ? `${activeAgents.join(' · ')} responding…` : `${activeRole} responding…`}</span>
          </div>
        ) : null}

        <div ref={bottomRef} />
      </div>
    </main>
  );
}
