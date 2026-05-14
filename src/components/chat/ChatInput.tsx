import { useEffect, useMemo, useRef } from 'react';
import type { DraftAttachment } from '../../store/sessions';
import type { Role } from '../../types';
import { Button } from '../ui/Button';

interface ChatInputProps {
  value: string;
  onChange: (value: string) => void;
  attachments: DraftAttachment[];
  onAddAttachment: () => void;
  onRemoveAttachment: (id: string) => void;
  onSubmit: () => void;
  disabled?: boolean;
  modelLabel?: string;
  activeRole: Role;
  branchSummary: string;
}

export function ChatInput({
  value,
  onChange,
  attachments,
  onAddAttachment,
  onRemoveAttachment,
  onSubmit,
  disabled = false,
  modelLabel = 'Copilot local session',
  activeRole,
  branchSummary
}: ChatInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    const element = textareaRef.current;
    if (!element) {
      return;
    }

    element.style.height = '0px';
    element.style.height = `${Math.min(element.scrollHeight, 200)}px`;
  }, [value]);

  const canSend = useMemo(() => !disabled && value.trim().length > 0, [disabled, value]);

  return (
    <footer data-testid="chat-composer" className="shrink-0 border-t border-borderDefault px-5 pb-6 pt-4">
      {attachments.length > 0 ? (
        <div className="mb-2 flex flex-wrap gap-2">
          {attachments.map((attachment) => (
            <span key={attachment.id} className="inline-flex items-center gap-2 rounded-full border border-borderStrong bg-bgSubtle px-2 py-1 text-xs text-textSecondary">
              <span className="font-mono">{attachment.label}</span>
              <button
                type="button"
                onClick={() => onRemoveAttachment(attachment.id)}
                className="rounded-sm px-1 text-textTertiary hover:text-textPrimary"
                aria-label={`Remove attachment ${attachment.label}`}
              >
                ×
              </button>
            </span>
          ))}
        </div>
      ) : null}

      <div className="rounded-lg border border-borderStrong bg-bgElevated p-2">
        <textarea
          ref={textareaRef}
          value={value}
          disabled={disabled}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && !event.shiftKey) {
              event.preventDefault();
              if (canSend) {
                onSubmit();
              }
            }
          }}
          placeholder="Ask Agent 42..."
          className="max-h-[var(--chat-input-max-height)] min-h-[76px] w-full resize-none bg-transparent px-2 py-1 text-sm text-textPrimary outline-none placeholder:text-textDisabled disabled:cursor-not-allowed"
          aria-label="Chat message input"
        />
        <div className="mt-2 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Button size="sm" variant="ghost" onClick={onAddAttachment} disabled={disabled} aria-label="Attach context">
              Attach context
            </Button>
            <span className="text-[10px] text-textTertiary">{modelLabel}</span>
          </div>
          <Button size="sm" onClick={onSubmit} disabled={!canSend} aria-label="Send message">
            Send
          </Button>
        </div>
      </div>
      <p className="mt-2 text-xs text-textTertiary">Responding as: {activeRole} · {branchSummary}</p>
    </footer>
  );
}
