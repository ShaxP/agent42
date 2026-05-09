import { Sidebar } from '../components/layout/Sidebar';
import { ProjectItem } from '../components/layout/ProjectItem';
import { Button } from '../components/ui/Button';
import { Logo } from '../components/ui/Logo';
import { ChatWindow } from './ChatWindow';

interface HomeProps {
  view: 'home' | 'chat';
  onViewChange: (view: 'home' | 'chat') => void;
}

const projects = [
  { id: 'p1', name: 'Acme Platform', repos: 3 },
  { id: 'p2', name: 'Payments Suite', repos: 2 }
];

export function Home({ view, onViewChange }: HomeProps) {
  return (
    <div className="flex h-[calc(100vh-36px)] min-h-[700px] bg-bgBase">
      <Sidebar
        header={<Logo size="sm" />}
        footer={
          <Button variant="secondary" className="w-full" aria-label="Create new project">
            + New Project
          </Button>
        }
      >
        <nav className="space-y-1" aria-label="Project list">
          {projects.map((project, idx) => (
            <ProjectItem key={project.id} project={project} selected={idx === 0} />
          ))}
        </nav>
      </Sidebar>
      <main className="flex-1 overflow-y-auto p-5">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold text-textPrimary">Acme Platform</h1>
            <p className="text-xs text-textSecondary">First implementation slice: shell + sign-in + navigation frame placeholders</p>
          </div>
          <div className="flex gap-2">
            <Button variant={view === 'home' ? 'secondary' : 'ghost'} size="sm" onClick={() => onViewChange('home')}>
              Home Frame
            </Button>
            <Button variant={view === 'chat' ? 'secondary' : 'ghost'} size="sm" onClick={() => onViewChange('chat')}>
              Chat Frame
            </Button>
          </div>
        </div>

        {view === 'home' ? (
          <section className="space-y-4">
            <div className="rounded-md border border-borderDefault bg-bgSurface p-4">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-sm font-medium text-textPrimary">Repos</h2>
                <Button size="sm" variant="secondary">Manage Repos</Button>
              </div>
              <div className="space-y-2 text-xs text-textSecondary">
                <div className="rounded-sm border border-borderDefault bg-bgElevated px-3 py-2">backend-api · /Users/dev/backend-api · main</div>
                <div className="rounded-sm border border-borderDefault bg-bgElevated px-3 py-2">frontend-web · /Users/dev/frontend-web · feature/login</div>
                <div className="rounded-sm border border-borderDefault bg-bgElevated px-3 py-2">shared-kernel · /Users/dev/shared-kernel · main</div>
              </div>
            </div>

            <div className="rounded-md border border-borderDefault bg-bgSurface p-4">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-sm font-medium text-textPrimary">Recent Sessions</h2>
                <Button size="sm">Open Chat</Button>
              </div>
              <div className="space-y-2 text-xs text-textSecondary">
                <div className="rounded-sm border border-borderDefault bg-bgElevated px-3 py-2">API risk review · QA Lead · 10m ago</div>
                <div className="rounded-sm border border-borderDefault bg-bgElevated px-3 py-2">Auth architecture walkthrough · Architect · 1h ago</div>
              </div>
            </div>
          </section>
        ) : (
          <ChatWindow />
        )}
      </main>
    </div>
  );
}
