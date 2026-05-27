import { forwardRef, type SelectHTMLAttributes } from 'react';
import { cn } from '../../lib/cn';

type SelectProps = SelectHTMLAttributes<HTMLSelectElement> & {
  label?: string;
  error?: string;
  options: Array<{ label: string; value: string }>;
};

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, label, error, id, options, ...props }, ref) => {
    const selectId = id ?? props.name;

    return (
      <label className="block">
        {label ? <span className="mb-1.5 block text-sm font-semibold text-ink-700">{label}</span> : null}
        <select
          id={selectId}
          ref={ref}
          className={cn(
            'focus-ring h-11 w-full rounded-lg border border-surface-200 bg-white px-3 text-sm text-ink-900 shadow-sm transition focus:border-redde-500',
            error && 'border-redde-500',
            className,
          )}
          {...props}
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        {error ? <span className="mt-1.5 block text-xs font-medium text-redde-700">{error}</span> : null}
      </label>
    );
  },
);

Select.displayName = 'Select';
