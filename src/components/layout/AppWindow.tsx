import type { ReactNode } from 'react';

interface AppWindowProps {
  title: string;
  children: ReactNode;
}

export function AppWindow({ title, children }: AppWindowProps) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-bgBase p-6 text-textPrimary">
      <div className="w-full max-w-[1200px] overflow-hidden rounded-xl border border-borderDefault bg-bgSurface shadow-window">
        <div className="flex h-9 items-center border-b border-borderDefault bg-bgElevated px-4">
          <div className="flex gap-1.5">
            <span className="h-3 w-3 rounded-full bg-error" aria-hidden />
            <span className="h-3 w-3 rounded-full bg-warning" aria-hidden />
            <span className="h-3 w-3 rounded-full bg-success" aria-hidden />
          </div>
          <div className="mx-auto pr-16 text-xs text-textSecondary">{title}</div>
        </div>
        {children}
      </div>
    </div>
  );
}
