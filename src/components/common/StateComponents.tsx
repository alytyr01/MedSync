import type { ReactNode } from 'react';
import { AlertCircle, Inbox, RefreshCw } from 'lucide-react';
import { Button } from './Button';

// ===== Loading State (circular spinner — the app's only allowed animation) =====

interface LoadingStateProps {
  label?: string;
  /** Kept for API compatibility; rendering is identical for all variants */
  variant?: 'default' | 'cards' | 'full';
}

export function LoadingState({
  label = 'Loading...',
}: LoadingStateProps) {
  return (
    <div
      className="flex flex-col items-center justify-center py-16 gap-4"
      role="status"
      aria-live="polite"
      aria-label={label}
    >
      <span className="w-7 h-7 rounded-full border-2 border-primary/15 border-t-primary animate-spin" />
      <p className="text-[13px] text-secondary">{label}</p>
    </div>
  );
}

// ===== Error State =====

interface ErrorStateProps {
  message?: string;
  onRetry?: () => void;
}

export function ErrorState({
  message = 'Something went wrong. Please try again.',
  onRetry,
}: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center gap-4">
      <div className="w-14 h-14 rounded-full bg-rose-soft flex items-center justify-center">
        <AlertCircle className="w-6 h-6 text-danger" strokeWidth={2} />
      </div>
      <p className="text-text font-medium text-[15px]">{message}</p>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry}>
          <RefreshCw className="w-4 h-4" strokeWidth={2} />
          Retry
        </Button>
      )}
    </div>
  );
}

// ===== Empty State =====

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center gap-3">
      <div className="w-16 h-16 rounded-[16px] bg-blue-soft flex items-center justify-center mb-1">
        {icon || <Inbox className="w-7 h-7 text-primary" strokeWidth={2} />}
      </div>
      <h3 className="text-text font-semibold text-[17px] tracking-tight">
        {title}
      </h3>
      {description && (
        <p className="text-secondary text-sm max-w-xs leading-relaxed">
          {description}
        </p>
      )}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
