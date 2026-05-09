interface LogoProps {
  size?: 'sm' | 'md';
}

export function Logo({ size = 'md' }: LogoProps) {
  const classes = size === 'sm' ? 'h-7 w-7 text-xs' : 'h-10 w-10 text-sm';

  return (
    <div className="inline-flex items-center gap-3">
      <span
        className={`inline-flex ${classes} items-center justify-center rounded-md border border-borderStrong bg-[var(--color-accent-subtle)] font-bold text-accent`}
        aria-hidden
      >
        42
      </span>
      <span className="text-sm font-semibold tracking-wide text-textPrimary">Agent 42</span>
    </div>
  );
}
