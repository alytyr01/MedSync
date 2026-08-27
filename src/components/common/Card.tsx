import type { HTMLAttributes, ReactNode } from 'react';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  interactive?: boolean;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  variant?: 'default' | 'muted' | 'primary' | 'warning';
  className?: string;
}

const paddingClasses = {
  none: '',
  sm: 'p-3.5',
  md: 'p-5',
  lg: 'p-6',
};

const variantClasses = {
  default: 'bg-surface',
  muted: 'bg-surface-muted',
  primary: 'bg-primary-soft',
  warning: 'bg-warning/5',
};

export function Card({
  children,
  interactive = false,
  padding = 'md',
  variant = 'default',
  className = '',
  ...props
}: CardProps) {
  const baseClasses = `
    premium-card
    ${paddingClasses[padding]}
    ${variantClasses[variant]}
    ${interactive ? 'pressable cursor-pointer' : ''}
    ${className}
  `;

  if (interactive) {
    return (
      <div className={baseClasses} {...props}>
        {children}
      </div>
    );
  }

  return (
    <div className={baseClasses} {...props}>
      {children}
    </div>
  );
}