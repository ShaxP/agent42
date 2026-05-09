interface SidebarItemProps {
  label: string;
  count?: number;
  selected?: boolean;
  onClick?: () => void;
}

export function SidebarItem({ label, count, selected = false, onClick }: SidebarItemProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center justify-between rounded-sm px-2 py-2 text-left text-xs transition-colors ${
        selected
          ? 'bg-[var(--color-accent-subtle)] text-textPrimary'
          : 'text-textSecondary hover:bg-bgSubtle hover:text-textPrimary'
      }`}
    >
      <span>{label}</span>
      {typeof count === 'number' ? <span className="text-textTertiary">{count}</span> : null}
    </button>
  );
}
