import { Button } from '../components/ui/Button';

export function ChatWindow() {
  return (
    <section className="flex h-full min-h-[560px] flex-col overflow-hidden rounded-md border border-borderDefault bg-bgSurface">
      <header className="flex h-10 items-center justify-between gap-3 border-b border-borderDefault px-4 text-xs text-textSecondary">
        <div className="flex items-center gap-3">
          <span className="text-textPrimary">Acme Platform</span>
          <span className="text-textTertiary">/ Session: API risk review</span>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="ghost">Sessions</Button>
          <Button size="sm" variant="secondary">Role: QA Lead</Button>
          <Button size="sm" variant="secondary">backend: main</Button>
          <Button size="sm" variant="secondary">Knowledge</Button>
        </div>
      </header>
      <div className="flex flex-1 overflow-hidden">
        <main className="flex-1 space-y-4 overflow-y-auto p-5">
          <div className="max-w-[70%] rounded-md border border-borderDefault bg-bgSubtle p-3 text-sm text-textPrimary">
            User message placeholder
          </div>
          <div className="max-w-[85%] text-sm text-textSecondary">Agent response stream placeholder</div>
        </main>
        <aside className="w-[var(--knowledge-panel-width)] border-l border-borderDefault bg-bgElevated p-3 text-xs text-textTertiary">
          Knowledge panel placeholder
        </aside>
      </div>
      <footer className="border-t border-borderDefault p-4">
        <div className="rounded-md border border-borderStrong bg-bgElevated p-3 text-sm text-textTertiary">
          Chat input placeholder · Responding as: QA Lead · backend:main
        </div>
      </footer>
    </section>
  );
}
