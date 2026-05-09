import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bgBase: 'var(--color-bg-base)',
        bgSurface: 'var(--color-bg-surface)',
        bgElevated: 'var(--color-bg-elevated)',
        bgSubtle: 'var(--color-bg-subtle)',
        borderDefault: 'var(--color-border-default)',
        borderStrong: 'var(--color-border-strong)',
        textPrimary: 'var(--color-text-primary)',
        textSecondary: 'var(--color-text-secondary)',
        textTertiary: 'var(--color-text-tertiary)',
        textDisabled: 'var(--color-text-disabled)',
        accent: 'var(--color-accent)',
        accentHover: 'var(--color-accent-hover)',
        success: 'var(--color-success)',
        warning: 'var(--color-warning)',
        error: 'var(--color-error)'
      },
      borderRadius: {
        sm: 'var(--radius-sm)',
        md: 'var(--radius-md)',
        lg: 'var(--radius-lg)',
        xl: 'var(--radius-xl)'
      },
      boxShadow: {
        window: 'var(--shadow-window)'
      },
      fontFamily: {
        sans: ['var(--font-family-base)'],
        mono: ['var(--font-family-mono)']
      }
    }
  },
  plugins: []
} satisfies Config;
