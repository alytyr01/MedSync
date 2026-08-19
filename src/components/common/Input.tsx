import { forwardRef } from 'react';
import type { InputHTMLAttributes, ReactNode } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  search?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      error,
      hint,
      leftIcon,
      rightIcon,
      search = false,
      className = '',
      ...props
    },
    ref
  ) => {
    return (
      <div className="w-full">
        {label && (
          <label className="block text-sm font-medium text-text mb-1.5">
            {label}
          </label>
        )}
        <div className="relative">
          {leftIcon && (
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-text-tertiary">
              {leftIcon}
            </div>
          )}
          <input
            ref={ref}
            className={`
              w-full bg-surface border text-text placeholder:text-text-tertiary/80
              transition-all duration-200
              focus:outline-none focus:ring-[3px]
              ${search
                ? 'h-[52px] pl-11 pr-4 rounded-[28px] border-border focus:ring-primary/10'
                : `h-[52px] px-4 rounded-[16px] text-[15px]
                   ${error
                     ? 'border-danger/60 focus:ring-danger/10 focus:border-danger'
                     : 'border-border focus:ring-primary/10 focus:border-primary/50'}`}
              ${leftIcon && !search ? 'pl-11' : ''}
              ${rightIcon ? 'pr-11' : ''}
              ${className}
            `}
            {...props}
          />
          {rightIcon && (
            <div className="absolute right-4 top-1/2 -translate-y-1/2 text-secondary">
              {rightIcon}
            </div>
          )}
        </div>
        {error ? (
          <p className="mt-1.5 text-[13px] text-danger">{error}</p>
        ) : hint ? (
          <p className="mt-1.5 text-[13px] text-secondary">{hint}</p>
        ) : null}
      </div>
    );
  }
);

Input.displayName = 'Input';
