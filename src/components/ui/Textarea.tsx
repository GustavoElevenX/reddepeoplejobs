import { forwardRef, type TextareaHTMLAttributes } from 'react';
import { cn } from '../../lib/cn';

type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label?: string;
  error?: string;
};

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, label, error, id, rows = 5, ...props }, ref) => {
    const textareaId = id ?? props.name;

    return (
      <label className="block">
        {label ? <span className="mb-1.5 block text-sm font-semibold text-ink-700">{label}</span> : null}
        <textarea
          id={textareaId}
          ref={ref}
          rows={rows}
          className={cn(
            'focus-ring w-full rounded-lg border border-surface-200 bg-white px-3 py-3 text-sm text-ink-900 shadow-sm transition placeholder:text-ink-500/70 focus:border-redde-500',
            error && 'border-redde-500',
            className,
          )}
          {...props}
        />
        {error ? <span className="mt-1.5 block text-xs font-medium text-redde-700">{error}</span> : null}
      </label>
    );
  },
);

Textarea.displayName = 'Textarea';
