import type { HTMLAttributes } from 'react';
import { cn } from '../../lib/cn';

type BadgeVariant = 'neutral' | 'success' | 'warning' | 'danger' | 'info';

type BadgeProps = HTMLAttributes<HTMLSpanElement> & {
  variant?: BadgeVariant;
};

const variants: Record<BadgeVariant, string> = {
  neutral: 'bg-surface-100 text-ink-700',
  success: 'bg-redde-50 text-redde-700',
  warning: 'bg-white text-ink-700 ring-1 ring-inset ring-surface-200',
  danger: 'bg-ink-900 text-white',
  info: 'bg-redde-100 text-redde-700',
};

export function Badge({ className, variant = 'neutral', ...props }: BadgeProps) {
  return (
    <span
      className={cn('inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold', variants[variant], className)}
      {...props}
    />
  );
}
