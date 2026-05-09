interface StatusIndicatorProps {
  state: 'idle' | 'active' | 'done' | 'error';
}

const stateClasses: Record<StatusIndicatorProps['state'], string> = {
  idle: 'bg-textDisabled',
  active: 'bg-accent animate-pulse',
  done: 'bg-success',
  error: 'bg-error'
};

export function StatusIndicator({ state }: StatusIndicatorProps) {
  return <span className={`inline-block h-2.5 w-2.5 rounded-full ${stateClasses[state]}`} aria-hidden />;
}
