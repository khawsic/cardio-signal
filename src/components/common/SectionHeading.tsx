import React from 'react';

interface SectionHeadingProps {
  number?: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export const SectionHeading: React.FC<SectionHeadingProps> = ({
  number,
  title,
  description,
  action,
}) => {
  return (
    <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 mb-6 pb-3 border-b border-slate-100">
      <div>
        <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-[#0A192F] flex items-center gap-2">
          {number && (
            <span className="text-cyan-700 font-mono text-lg font-semibold">
              {number}
            </span>
          )}
          <span>{title}</span>
        </h2>
        {description && (
          <p className="mt-1 text-sm text-slate-500 max-w-2xl">
            {description}
          </p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
};
