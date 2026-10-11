import React from 'react';
import { AlertCircle, CheckCircle2, Info, AlertTriangle } from 'lucide-react';

interface StatusMessageProps {
  type?: 'info' | 'success' | 'warning' | 'error';
  title?: string;
  children: React.ReactNode;
  className?: string;
}

export const StatusMessage: React.FC<StatusMessageProps> = ({
  type = 'info',
  title,
  children,
  className = '',
}) => {
  const styles = {
    info: {
      bg: 'bg-slate-50',
      border: 'border-slate-200',
      text: 'text-slate-800',
      icon: <Info className="w-4 h-4 text-cyan-700 shrink-0 mt-0.5" />,
    },
    success: {
      bg: 'bg-emerald-50/50',
      border: 'border-emerald-200',
      text: 'text-emerald-900',
      icon: <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />,
    },
    warning: {
      bg: 'bg-amber-50/50',
      border: 'border-amber-200',
      text: 'text-amber-900',
      icon: <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />,
    },
    error: {
      bg: 'bg-rose-50/50',
      border: 'border-rose-200',
      text: 'text-rose-900',
      icon: <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />,
    },
  }[type];

  return (
    <div
      className={`border rounded-lg p-3.5 flex items-start gap-3 ${styles.bg} ${styles.border} ${className}`}
    >
      {styles.icon}
      <div className={`text-xs sm:text-sm ${styles.text} flex-1`}>
        {title && <p className="font-semibold mb-0.5">{title}</p>}
        <div>{children}</div>
      </div>
    </div>
  );
};

interface EmptyStateProps {
  title: string;
  description: string;
  action?: React.ReactNode;
  icon?: React.ReactNode;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  action,
  icon,
}) => {
  return (
    <div className="border border-dashed border-slate-300 rounded-xl p-8 sm:p-12 text-center bg-slate-50/50">
      {icon && <div className="mx-auto mb-3 text-slate-400 flex justify-center">{icon}</div>}
      <h3 className="text-base font-semibold text-[#0A192F] mb-1">{title}</h3>
      <p className="text-sm text-slate-500 max-w-md mx-auto mb-5 leading-relaxed">{description}</p>
      {action && <div className="flex justify-center">{action}</div>}
    </div>
  );
};
