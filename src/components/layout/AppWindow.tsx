import type { ReactNode } from 'react';

interface AppWindowProps {
  children: ReactNode;
}

export function AppWindow({ children }: AppWindowProps) {
  return (
    <div className="min-h-screen bg-bgBase text-textPrimary">
      {children}
    </div>
  );
}
