import { motion } from 'framer-motion';
import type { ReactNode } from 'react';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}

export function PageHeader({ title, subtitle, action }: PageHeaderProps) {
  return (
    <motion.header
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-end justify-between px-1 pt-8 pb-5"
    >
      <div>
        <h1 className="text-[28px] font-bold text-text tracking-tight leading-tight">
          {title}
        </h1>
        {subtitle && (
          <p className="text-sm text-secondary mt-1">{subtitle}</p>
        )}
      </div>
      {action && <div className="ml-4 shrink-0 mb-0.5">{action}</div>}
    </motion.header>
  );
}

export function BackHeader({
  title,
  onBack,
  action,
}: {
  title: string;
  onBack: () => void;
  action?: ReactNode;
}) {
  return (
    <motion.header
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-center gap-2 pt-7 pb-4"
    >
      <button
        onClick={onBack}
        className="w-9 h-9 -ml-2 rounded-full flex items-center justify-center text-secondary hover:bg-surface-muted transition-colors"
        aria-label="Go back"
      >
        <svg
          className="w-5 h-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M15 19l-7-7 7-7"
          />
        </svg>
      </button>
      <h1 className="text-lg font-semibold text-text tracking-tight flex-1">
        {title}
      </h1>
      {action}
    </motion.header>
  );
}
