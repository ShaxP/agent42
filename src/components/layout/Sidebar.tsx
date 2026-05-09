import type { ReactNode } from 'react';

interface SidebarProps {
  header?: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
}

export function Sidebar({ header, footer, children }: SidebarProps) {
  return (
    <aside className="flex h-full w-[var(--sidebar-width)] flex-col border-r border-borderDefault bg-bgElevated">
      {header ? <div className="border-b border-borderDefault p-3">{header}</div> : null}
      <div className="flex-1 overflow-y-auto p-2">{children}</div>
      {footer ? <div className="border-t border-borderDefault p-3">{footer}</div> : null}
    </aside>
  );
}
