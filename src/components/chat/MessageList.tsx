import { useEffect, useMemo, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import rehypeHighlight from 'rehype-highlight';
import remarkBreaks from 'remark-breaks';
import remarkGfm from 'remark-gfm';
import type { Role } from '../../types';
import type { ChatMessage } from '../../store/sessions';
import { roleBadgeClass } from './RoleSelector';

interface MessageListProps {
  messages: ChatMessage[];
  streaming: boolean;
  activeAgents: string[];
  activeRole: Role;
  activeStatusDetails: string[];
}

const TABLE_ROW_LINE = /^\s*\|(?:[^|\n]*\|){2,}\s*$/;
const TABLE_SEPARATOR_LINE = /^\s*:?-{3,}:?(?:\s*\|\s*:?-{3,}:?)+\s*$/;

function isMarkdownTableLine(line: string): boolean {
  return TABLE_ROW_LINE.test(line) || TABLE_SEPARATOR_LINE.test(line);
}

function normalizeTableBoundaries(content: string): string {
  const lines = content.split('\n');
  const normalized: string[] = [];
  let inCodeFence = false;

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    if (/^\s*```/.test(line)) {
      inCodeFence = !inCodeFence;
      normalized.push(line);
      continue;
    }

    normalized.push(line);
    if (inCodeFence || !isMarkdownTableLine(line)) {
      continue;
    }

    const nextLine = lines[index + 1];
    if (!nextLine || nextLine.trim() === '' || isMarkdownTableLine(nextLine)) {
      continue;
    }

    normalized.push('');
  }

  return normalized.join('\n');
}

function FormattedMessage({ content }: { content: string }) {
  const normalizedContent = useMemo(() => normalizeTableBoundaries(content), [content]);

  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm, remarkBreaks]}
      rehypePlugins={[rehypeHighlight]}
      components={{
        p: ({ children }) => <p className="mb-3 last:mb-0">{children}</p>,
        ul: ({ children }) => <ul className="mb-3 list-disc space-y-1 pl-5 last:mb-0">{children}</ul>,
        ol: ({ children }) => <ol className="mb-3 list-decimal space-y-1 pl-5 last:mb-0">{children}</ol>,
        li: ({ children }) => <li>{children}</li>,
        h1: ({ children }) => <h1 className="mb-2 text-lg font-semibold">{children}</h1>,
        h2: ({ children }) => <h2 className="mb-2 text-base font-semibold">{children}</h2>,
        h3: ({ children }) => <h3 className="mb-1 text-sm font-semibold">{children}</h3>,
        code: ({ children, className }) => {
          const isInline = !className?.includes('language-');
          if (isInline) {
            return <code className="rounded bg-bgSubtle px-1 py-0.5 font-mono text-[0.85em]">{children}</code>;
          }
          return <code className={`font-mono text-[0.85em] ${className ?? ''}`}>{children}</code>;
        },
        pre: ({ children }) => (
          <pre className="chat-code-block mb-3 overflow-x-auto rounded-sm bg-bgSubtle p-2 text-xs last:mb-0">
            {children}
          </pre>
        ),
        blockquote: ({ children }) => (
          <blockquote className="mb-3 border-l-2 border-borderDefault pl-3 text-textSecondary last:mb-0">
            {children}
          </blockquote>
        )
      }}
    >
      {normalizedContent}
    </ReactMarkdown>
  );
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

export function MessageList({ messages, streaming, activeAgents, activeRole, activeStatusDetails }: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, streaming]);

  return (
    <main className="flex-1 overflow-y-auto py-4 pl-10 pr-5">
      <div className="mx-auto flex w-full max-w-none flex-col gap-4">
        {messages.map((message) => {
          if (message.role === 'user') {
            return (
              <article key={message.id} className="ml-auto mr-5 w-full max-w-[92%] rounded-md border border-borderDefault bg-bgSubtle px-3 py-2">
                <p className="mb-1 text-[10px] uppercase tracking-[0.08em] text-textTertiary">You · {formatTimestamp(message.timestamp)}</p>
                <div className="text-sm leading-relaxed text-textPrimary">
                  <FormattedMessage content={message.content} />
                </div>
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
                <div className="text-sm leading-relaxed text-textPrimary">
                  <FormattedMessage content={message.content || '...'} />
                </div>
              </div>
            </article>
          );
        })}

        {streaming ? (
          <div className="text-xs text-textSecondary" aria-live="polite">
            <div className="inline-flex items-center gap-2 italic">
              <span className="inline-flex h-2 w-2 animate-pulse rounded-full bg-accent" aria-hidden />
              <span>{activeAgents.length > 0 ? `${activeAgents.join(' · ')} responding…` : `${activeRole} responding…`}</span>
            </div>
            {activeStatusDetails.length > 0 ? (
              <div className="mt-1 space-y-0.5 text-textTertiary">
                {activeStatusDetails.map((detail, index) => (
                  <div key={`${index}-${detail}`}>{detail}</div>
                ))}
              </div>
            ) : null}
          </div>
        ) : null}

        <div ref={bottomRef} />
      </div>
    </main>
  );
}
