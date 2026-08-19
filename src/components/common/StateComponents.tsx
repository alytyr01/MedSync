import type { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { FiAlertCircle, FiInbox, FiRefreshCw } from 'react-icons/fi';
import { Button } from './Button';

// ===== Loading State (Skeleton) =====

interface LoadingStateProps {
  label?: string;
  variant?: 'default' | 'cards' | 'full';
}

export function LoadingState({
  label = 'Loading...',
  variant = 'default',
}: LoadingStateProps) {
  if (variant === 'cards') {
    return (
      <div className="space-y-3 mt-2" aria-label={label}>
        {[0, 1, 2].map((i) => (
          <div key={i} className="premium-card p-5">
            <div className="flex items-center justify-between">
              <div className="flex-1 space-y-2.5">
                <div className="skeleton h-4 w-2/5" />
                <div className="skeleton h-3 w-3/5" />
                <div className="skeleton h-3 w-1/3" />
              </div>
              <div className="skeleton h-10 w-10 rounded-full ml-4" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center py-16 gap-4">
      <div className="w-full max-w-xs space-y-3">
        <div className="skeleton h-5 w-3/4 mx-auto" />
        <div className="skeleton h-4 w-1/2 mx-auto" />
      </div>
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
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center py-16 px-6 text-center gap-4"
    >
      <div className="w-14 h-14 rounded-full bg-danger/10 flex items-center justify-center">
        <FiAlertCircle className="w-6 h-6 text-danger" />
      </div>
      <p className="text-text font-medium text-[15px]">{message}</p>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry}>
          <FiRefreshCw className="w-4 h-4" />
          Retry
        </Button>
      )}
    </motion.div>
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
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center py-16 px-6 text-center gap-3"
    >
      <div className="w-16 h-16 rounded-[20px] bg-primary-soft flex items-center justify-center mb-1">
        {icon || <FiInbox className="w-7 h-7 text-primary" />}
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
    </motion.div>
  );
}
