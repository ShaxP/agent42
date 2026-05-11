import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import type { Role } from '../../types';

interface RoleSelectorProps {
  value: Role;
  onChange: (role: Role) => void;
}

const ROLES: Role[] = [
  'Architect',
  'Business Analyst',
  'Developer',
  'DevOps Engineer',
  'QA Lead',
  'Tester',
  'Test Automation Expert',
  'DB Expert',
  'Security Reviewer',
  'Technical Writer'
];

const ROLE_CLASSES: Record<Role, string> = {
  Architect: 'border-[color:var(--color-role-architect-fg)] bg-[var(--color-role-architect-bg)] text-[var(--color-role-architect-fg)]',
  'Business Analyst':
    'border-[color:var(--color-role-analyst-fg)] bg-[var(--color-role-analyst-bg)] text-[var(--color-role-analyst-fg)]',
  Developer: 'border-[color:var(--color-role-developer-fg)] bg-[var(--color-role-developer-bg)] text-[var(--color-role-developer-fg)]',
  'DevOps Engineer': 'border-[color:var(--color-role-devops-fg)] bg-[var(--color-role-devops-bg)] text-[var(--color-role-devops-fg)]',
  'QA Lead': 'border-[color:var(--color-role-qa-lead-fg)] bg-[var(--color-role-qa-lead-bg)] text-[var(--color-role-qa-lead-fg)]',
  Tester: 'border-[color:var(--color-role-tester-fg)] bg-[var(--color-role-tester-bg)] text-[var(--color-role-tester-fg)]',
  'Test Automation Expert':
    'border-[color:var(--color-role-automation-fg)] bg-[var(--color-role-automation-bg)] text-[var(--color-role-automation-fg)]',
  'DB Expert': 'border-[color:var(--color-role-db-expert-fg)] bg-[var(--color-role-db-expert-bg)] text-[var(--color-role-db-expert-fg)]',
  'Security Reviewer':
    'border-[color:var(--color-role-security-fg)] bg-[var(--color-role-security-bg)] text-[var(--color-role-security-fg)]',
  'Technical Writer':
    'border-[color:var(--color-role-tech-writer-fg)] bg-[var(--color-role-tech-writer-bg)] text-[var(--color-role-tech-writer-fg)]'
};

export function roleBadgeClass(role: Role): string {
  return ROLE_CLASSES[role];
}

export function RoleSelector({ value, onChange }: RoleSelectorProps) {
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          type="button"
          className={`inline-flex h-8 items-center rounded-md border px-3 text-xs font-medium transition hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${roleBadgeClass(value)}`}
          aria-label="Select active role"
        >
          {value}
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          sideOffset={6}
          align="end"
          className="z-[var(--z-dropdown)] min-w-[220px] rounded-md border border-borderDefault bg-bgElevated p-1 shadow-md"
        >
          {ROLES.map((role) => {
            const selected = role === value;
            return (
              <DropdownMenu.Item
                key={role}
                onSelect={() => onChange(role)}
                className={`flex cursor-pointer items-center justify-between rounded-sm px-2 py-1.5 text-xs outline-none data-[highlighted]:bg-bgSubtle ${selected ? 'text-textPrimary' : 'text-textSecondary'}`}
              >
                <span>{role}</span>
                {selected ? <span aria-hidden>✓</span> : null}
              </DropdownMenu.Item>
            );
          })}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
