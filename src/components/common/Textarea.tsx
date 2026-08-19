import { forwardRef } from 'react';
import type { TextareaHTMLAttributes } from 'react';

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, className = '', ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label className="block text-sm font-medium text-text mb-1.5">
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          className={`
            w-full px-4 py-3.5 bg-surface border rounded-[14px]
            text-[15px] text-text placeholder:text-text-tertiary/80 resize-none
            transition-all duration-200
            focus:outline-none focus:ring-[3px]
            ${
              error
                ? 'border-danger/60 focus:ring-danger/10 focus:border-danger'
                : 'border-border focus:ring-primary/10 focus:border-primary/50'
            }
            ${className}
          `}
          {...props}
        />
        {error && <p className="mt-1.5 text-[13px] text-danger">{error}</p>}
      </div>
    );
  }
);

Textarea.displayName = 'Textarea';