import { forwardRef, type InputHTMLAttributes } from 'react';
import { cn } from '../../lib/cn';

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  error?: string;
  helperText?: string;
};

export const Input = forwardRef<HTMLInputElement, InputProps>(({ className, label, error, helperText, id, ...props }, ref) => {
  const inputId = id ?? props.name;

  return (
    <label className="block">
      {label ? <span className="mb-1.5 block text-sm font-semibold text-ink-700">{label}</span> : null}
      <input
        id={inputId}
        ref={ref}
        className={cn(
          'focus-ring h-11 w-full rounded-lg border border-surface-200 bg-white px-3 text-sm text-ink-900 shadow-sm transition placeholder:text-ink-500/70 focus:border-redde-500',
          error && 'border-redde-500',
          className,
        )}
        {...props}
      />
      {helperText ? <span className="mt-1.5 block text-xs text-ink-500">{helperText}</span> : null}
      {error ? <span className="mt-1.5 block text-xs font-medium text-redde-700">{error}</span> : null}
    </label>
  );
});

Input.displayName = 'Input';
