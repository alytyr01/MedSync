import type { ReactNode } from 'react';

type BadgeVariant = 'success' | 'warning' | 'danger' | 'info' | 'neutral';

interface BadgeProps {
  variant?: BadgeVariant;
  children: ReactNode;
  className?: string;
  dot?: boolean;
}

const variantClasses: Record<BadgeVariant, string> = {
  success: 'bg-mint-soft text-mint-deep',
  warning: 'bg-yellow-soft text-yellow-deep',
  danger: 'bg-rose-soft text-rose-deep',
  info: 'bg-blue-soft text-blue-deep',
  neutral: 'bg-surface-muted text-secondary',
};

const dotColors: Record<BadgeVariant, string> = {
  success: 'bg-success',
  warning: 'bg-warning',
  danger: 'bg-danger',
  info: 'bg-primary',
  neutral: 'bg-secondary/50',
};

export function Badge({
  variant = 'neutral',
  children,
  className = '',
  dot = false,
}: BadgeProps) {
  return (
    <span
      className={`
        inline-flex items-center gap-1.5 px-3 py-1
        rounded-full text-xs font-semibold
        ${variantClasses[variant]}
        ${className}
      `}
    >
      {dot && <span className={`w-1.5 h-1.5 rounded-full ${dotColors[variant]}`} />}
      {children}
    </span>
  );
}