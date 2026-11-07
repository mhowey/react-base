import type { MantineColorsTuple } from '@mantine/core';

/**
 * Design tokens — the raw values of the design system.
 * Change these to rebrand the whole app; components never hard-code values.
 * Each colour is a 10-step scale (0 = lightest, 9 = darkest) as Mantine expects.
 */

export const palette = {
  brand: ['#eef2ff', '#e0e7ff', '#c7d2fe', '#a5b4fc', '#818cf8', '#6366f1', '#4f46e5', '#4338ca', '#3730a3', '#312e81'],
  accent: ['#f0f9ff', '#e0f2fe', '#bae6fd', '#7dd3fc', '#38bdf8', '#0ea5e9', '#0284c7', '#0369a1', '#075985', '#0c4a6e'],
  success: ['#ecfdf5', '#d1fae5', '#a7f3d0', '#6ee7b7', '#34d399', '#10b981', '#059669', '#047857', '#065f46', '#064e3b'],
  warning: ['#fffbeb', '#fef3c7', '#fde68a', '#fcd34d', '#fbbf24', '#f59e0b', '#d97706', '#b45309', '#92400e', '#78350f'],
  danger: ['#fef2f2', '#fee2e2', '#fecaca', '#fca5a5', '#f87171', '#ef4444', '#dc2626', '#b91c1c', '#991b1b', '#7f1d1d'],
  neutral: ['#f8fafc', '#f1f5f9', '#e2e8f0', '#cbd5e1', '#94a3b8', '#64748b', '#475569', '#334155', '#1e293b', '#0f172a'],
  /** Mantine's dark-mode surface scale (text → borders → surfaces → body). */
  dark: ['#d5dbe8', '#b4bdd0', '#8f9ab3', '#66728f', '#3a4560', '#2a3450', '#1a2234', '#111827', '#0b1020', '#070b16'],
} satisfies Record<string, MantineColorsTuple>;

export const typography = {
  fontFamily: 'Inter, ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
  fontFamilyMonospace: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
  headingWeight: '700',
  sizes: { xs: '0.75rem', sm: '0.875rem', md: '1rem', lg: '1.125rem', xl: '1.25rem' },
  headings: {
    h1: { fontSize: '2.75rem', lineHeight: '1.15' },
    h2: { fontSize: '2rem', lineHeight: '1.2' },
    h3: { fontSize: '1.5rem', lineHeight: '1.3' },
    h4: { fontSize: '1.25rem', lineHeight: '1.35' },
    h5: { fontSize: '1.05rem', lineHeight: '1.4' },
    h6: { fontSize: '0.95rem', lineHeight: '1.45' },
  },
};

export const spacing = { xs: '0.5rem', sm: '0.75rem', md: '1rem', lg: '1.5rem', xl: '2rem' };
export const radius = { xs: '4px', sm: '6px', md: '8px', lg: '12px', xl: '20px' };

export const shadows = {
  xs: '0 1px 2px rgb(15 23 42 / 0.06)',
  sm: '0 1px 3px rgb(15 23 42 / 0.08), 0 1px 2px rgb(15 23 42 / 0.04)',
  md: '0 4px 12px rgb(15 23 42 / 0.08)',
  lg: '0 12px 32px rgb(15 23 42 / 0.12)',
  xl: '0 24px 48px rgb(15 23 42 / 0.16)',
};

/**
 * Semantic tokens — role-based values that differ by colour scheme.
 * Exposed as CSS variables (`var(--app-surface)` etc.) via the theme's cssVariablesResolver.
 */
export const semantic = {
  light: {
    '--app-bg': palette.neutral[0],
    '--app-surface': '#ffffff',
    '--app-surface-muted': palette.neutral[1],
    '--app-border': palette.neutral[2],
    '--app-text': palette.neutral[9],
    '--app-text-muted': palette.neutral[5],
    '--app-hero-gradient': `linear-gradient(135deg, ${palette.brand[6]} 0%, ${palette.accent[5]} 100%)`,
  },
  dark: {
    '--app-bg': '#0b1020',
    '--app-surface': '#111827',
    '--app-surface-muted': '#1a2234',
    '--app-border': '#2a3450',
    '--app-text': palette.neutral[1],
    '--app-text-muted': palette.neutral[4],
    '--app-hero-gradient': `linear-gradient(135deg, ${palette.brand[4]} 0%, ${palette.accent[4]} 100%)`,
  },
};
