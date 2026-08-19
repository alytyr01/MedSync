import { forwardRef } from 'react';
import type { SelectHTMLAttributes } from 'react';
import { FiChevronDown } from 'react-icons/fi';

interface SelectOption {
  value: string | number;
  label: string;
}

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: SelectOption[];
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, options, className = '', ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label className="block text-sm font-medium text-text mb-1.5">
            {label}
          </label>
        )}
        <div className="relative">
          <select
            ref={ref}
            className={`
              w-full appearance-none h-[52px] px-4 pr-10 bg-surface border rounded-[14px]
              text-[15px] text-text transition-all duration-200
              focus:outline-none focus:ring-[3px]
              ${
                error
                  ? 'border-danger/60 focus:ring-danger/10 focus:border-danger'
                  : 'border-border focus:ring-primary/10 focus:border-primary/50'
              }
              ${className}
            `}
            {...props}
          >
            {options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <FiChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-text-tertiary pointer-events-none" />
        </div>
        {error && <p className="mt-1.5 text-[13px] text-danger">{error}</p>}
      </div>
    );
  }
);

Select.displayName = 'Select';