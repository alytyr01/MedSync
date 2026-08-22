import type { ReactNode } from 'react';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}

export function PageHeader({ title, subtitle, action }: PageHeaderProps) {
  return (
    <header className="flex items-end justify-between px-1 pt-8 pb-6">
      <div>
        <h1 className="text-[32px] font-bold text-text tracking-tight leading-tight">
          {title}
        </h1>
        {subtitle && (
          <p className="text-[15px] text-secondary mt-1.5">{subtitle}</p>
        )}
      </div>
      {action && <div className="ml-4 shrink-0 mb-0.5">{action}</div>}
    </header>
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
    <header className="flex items-center gap-2 pt-7 pb-5">
      <button
        onClick={onBack}
        className="w-10 h-10 -ml-2 rounded-full flex items-center justify-center text-secondary hover:bg-surface-muted transition-colors"
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
      <h1 className="text-[20px] font-semibold text-text tracking-tight flex-1">
        {title}
      </h1>
      {action}
    </header>
  );
}